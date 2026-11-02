import prisma from "../data/prisma.js";
import { erro, idValido, contarIntegrantes, garantirCargosPadrao, obterContextoEquipe, pode, cargoExcedePermissoesDoAtor, obterLimiteDoPlano, montarResumoEquipe } from "../services/equipe.service.js";

export async function listarIntegrantes(req, res) {
    try {
        const contexto = await obterContextoEquipe(req.params.id, req.usuario.id);
        if (contexto.mensagem) return erro(res, contexto.status, contexto.mensagem);
        if (!pode(contexto, "visualizarAmbiente") && !pode(contexto, "gerenciarIntegrantes") && !pode(contexto, "gerenciarCargos")) {
            return erro(res, 403, "Seu cargo não permite consultar os integrantes.");
        }

        const integrantes = await prisma.equipeIntegrantes.findMany({
            where: { equipeId: contexto.equipe.id },
            include: {
                usuario: { select: { id: true, nome: true, email: true, fotoPerfil: true } },
                cargo: true
            },
            orderBy: { createdAt: "asc" }
        });

        return res.status(200).json({
            integrantes: integrantes.map((item) => ({
                id: item.id,
                usuarioId: item.usuarioId,
                nome: item.usuario.nome,
                email: item.usuario.email,
                fotoPerfil: item.usuario.fotoPerfil,
                entrouEm: item.createdAt,
                cargo: item.cargo,
                lider: item.usuarioId === contexto.equipe.usuarioId
            })),
            quantidadeIntegrantes: integrantes.length,
            limiteIntegrantes: Math.min(
                contexto.equipe.limiteIntegrantes,
                obterLimiteDoPlano(contexto.equipe.plano) ?? contexto.equipe.limiteIntegrantes
            ),
            codigo: contexto.equipe.codigo,
            souDono: contexto.souDono,
            permissoes: contexto.permissoes
        });
    } catch (error) {
        console.error("Erro ao listar integrantes:", error);
        return erro(res, 500, "Não foi possível carregar os integrantes.");
    }
}

// O próprio usuário entra na equipe com o código de convite. Não existe inclusão por e-mail.
export async function entrarEquipePorCodigo(req, res) {
    try {
        const codigo = typeof req.body.codigo === "string" ? req.body.codigo.trim().toUpperCase() : "";
        if (!/^[A-F\d]{8}$/.test(codigo)) return erro(res, 400, "Informe um código de equipe válido.");

        const equipe = await prisma.equipes.findUnique({ where: { codigo } });
        if (!equipe) return erro(res, 404, "Nenhuma equipe foi encontrada com esse código.");
        if (equipe.usuarioId === req.usuario.id) return erro(res, 409, "Você já é o líder desta equipe.");

        const existente = await prisma.equipeIntegrantes.findUnique({
            where: { equipeId_usuarioId: { equipeId: equipe.id, usuarioId: req.usuario.id } }
        });
        if (existente) return erro(res, 409, "Você já faz parte desta equipe.");

        const quantidade = await contarIntegrantes(equipe.id);
        const limite = Math.min(
            equipe.limiteIntegrantes,
            obterLimiteDoPlano(equipe.plano) ?? equipe.limiteIntegrantes
        );
        if (quantidade >= limite) return erro(res, 409, "A equipe atingiu o limite de integrantes do plano.");

        const cargos = await garantirCargosPadrao(equipe.id, equipe.usuarioId);
        await prisma.equipeIntegrantes.create({
            data: {
                equipeId: equipe.id,
                usuarioId: req.usuario.id,
                cargoId: cargos.Operador.id
            }
        });

        return res.status(200).json({
            mensagem: `Você entrou na equipe ${equipe.nome}.`,
            equipe: await montarResumoEquipe(equipe, req.usuario.id)
        });
    } catch (error) {
        console.error("Erro ao entrar na equipe por código:", error);
        return erro(res, 500, "Não foi possível entrar na equipe.");
    }
}

// Atualiza o cargo de APENAS um vínculo EquipeIntegrantes, identificado pela rota.
export async function atualizarCargoIntegrante(req, res) {
    try {
        const contexto = await obterContextoEquipe(req.params.id, req.usuario.id);
        if (contexto.mensagem) return erro(res, contexto.status, contexto.mensagem);
        if (!pode(contexto, "gerenciarIntegrantes")) return erro(res, 403, "Seu cargo não permite alterar cargos de integrantes.");

        const { integranteId } = req.params;
        const { cargoId } = req.body;
        if (!idValido(integranteId) || !idValido(cargoId)) return erro(res, 400, "ID de integrante ou cargo inválido.");

        const [integrante, cargoNovo] = await Promise.all([
            prisma.equipeIntegrantes.findFirst({
                where: { id: integranteId, equipeId: contexto.equipe.id },
                include: { cargo: true }
            }),
            prisma.cargosEquipe.findFirst({
                where: { id: cargoId, equipeId: contexto.equipe.id }
            })
        ]);

        if (!integrante || !cargoNovo) return erro(res, 404, "Integrante ou cargo não encontrado nesta equipe.");
        if (integrante.usuarioId === contexto.equipe.usuarioId) return erro(res, 403, "O cargo do líder não pode ser alterado.");
        if (cargoNovo.nome === "Líder") return erro(res, 400, "O cargo Líder pertence ao proprietário da equipe.");

        // Administradores só podem alterar integrantes abaixo do seu nível.
        if (!contexto.souDono && integrante.cargo.nome === "Administrador") {
            return erro(res, 403, "Somente o líder pode alterar o cargo de um administrador.");
        }
        if (!contexto.souDono && cargoNovo.nome === "Administrador") {
            return erro(res, 403, "Somente o líder pode atribuir o cargo de Administrador.");
        }
        if (!contexto.souDono && cargoExcedePermissoesDoAtor(integrante.cargo, contexto.permissoes)) {
            return erro(res, 403, "Você não pode alterar o cargo de um integrante com permissões superiores às suas.");
        }
        if (!contexto.souDono && cargoExcedePermissoesDoAtor(cargoNovo, contexto.permissoes)) {
            return erro(res, 403, "Você não pode atribuir um cargo com permissões superiores às suas.");
        }

        const atualizado = await prisma.equipeIntegrantes.update({
            where: { id: integrante.id },
            data: { cargoId: cargoNovo.id },
            include: {
                usuario: { select: { id: true, nome: true, email: true, fotoPerfil: true } },
                cargo: true
            }
        });

        return res.status(200).json({
            mensagem: "Cargo do integrante atualizado.",
            integrante: {
                id: atualizado.id,
                usuarioId: atualizado.usuarioId,
                nome: atualizado.usuario.nome,
                email: atualizado.usuario.email,
                fotoPerfil: atualizado.usuario.fotoPerfil,
                cargo: atualizado.cargo,
                lider: false
            }
        });
    } catch (error) {
        console.error("Erro ao atualizar cargo do integrante:", error);
        return erro(res, 500, "Não foi possível atualizar o cargo do integrante.");
    }
}

export async function removerIntegrante(req, res) {
    try {
        const contexto = await obterContextoEquipe(req.params.id, req.usuario.id);
        if (contexto.mensagem) return erro(res, contexto.status, contexto.mensagem);
        if (!pode(contexto, "gerenciarIntegrantes")) return erro(res, 403, "Seu cargo não permite remover integrantes.");
        if (!idValido(req.params.integranteId)) return erro(res, 400, "ID de integrante inválido.");

        const integrante = await prisma.equipeIntegrantes.findFirst({
            where: { id: req.params.integranteId, equipeId: contexto.equipe.id },
            include: { cargo: true }
        });
        if (!integrante) return erro(res, 404, "Integrante não encontrado.");
        if (integrante.usuarioId === contexto.equipe.usuarioId) return erro(res, 403, "O líder não pode ser removido da equipe.");
        if (!contexto.souDono && integrante.cargo.nome === "Administrador") {
            return erro(res, 403, "Somente o líder pode remover outro administrador.");
        }
        if (!contexto.souDono && cargoExcedePermissoesDoAtor(integrante.cargo, contexto.permissoes)) {
            return erro(res, 403, "Você não pode remover um integrante com permissões superiores às suas.");
        }

        await prisma.equipeIntegrantes.delete({ where: { id: integrante.id } });
        return res.status(200).json({ mensagem: "Integrante removido da equipe." });
    } catch (error) {
        console.error("Erro ao remover integrante:", error);
        return erro(res, 500, "Não foi possível remover o integrante.");
    }
}