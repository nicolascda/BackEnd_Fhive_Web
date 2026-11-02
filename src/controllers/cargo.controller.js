import prisma from "../data/prisma.js";
import {
    erro,
    idValido,
    garantirCargosPadrao,
    obterContextoEquipe,
    pode,
    cargoExcedePermissoesDoAtor,
    CARGOS_PADRAO,
    PERMISSOES_EQUIPE,
    normalizarPermissoes
} from "../services/equipe.service.js";

const COR_VALIDA = /^#[0-9A-Fa-f]{6}$/;

export async function listarCargos(req, res) {
    try {
        const contexto = await obterContextoEquipe(req.params.id, req.usuario.id);
        if (contexto.mensagem) return erro(res, contexto.status, contexto.mensagem);
        await garantirCargosPadrao(contexto.equipe.id, contexto.equipe.usuarioId);

        const cargos = await prisma.cargosEquipe.findMany({
            where: { equipeId: contexto.equipe.id },
            orderBy: { createdAt: "asc" }
        });

        return res.status(200).json({
            cargos,
            permissoesDisponiveis: PERMISSOES_EQUIPE,
            podeGerenciarCargos: pode(contexto, "gerenciarCargos"),
            podeGerenciarIntegrantes: pode(contexto, "gerenciarIntegrantes"),
            permissoesAtuais: contexto.permissoes
        });
    } catch (error) {
        console.error("Erro ao listar cargos:", error);
        return erro(res, 500, "Não foi possível carregar os cargos.");
    }
}

export async function criarCargo(req, res) {
    try {
        const contexto = await obterContextoEquipe(req.params.id, req.usuario.id);
        if (contexto.mensagem) return erro(res, contexto.status, contexto.mensagem);
        if (!pode(contexto, "gerenciarCargos")) return erro(res, 403, "Seu cargo não permite criar cargos.");

        const nome = typeof req.body.nome === "string" ? req.body.nome.trim() : "";
        const descricao = typeof req.body.descricao === "string" ? req.body.descricao.trim() : "";
        const cor = typeof req.body.cor === "string" ? req.body.cor : "";
        if (nome.length < 2 || nome.length > 40) return erro(res, 400, "O nome do cargo deve ter entre 2 e 40 caracteres.");
        if (descricao.length > 180) return erro(res, 400, "A descrição deve ter no máximo 180 caracteres.");
        if (!COR_VALIDA.test(cor)) return erro(res, 400, "Informe uma cor hexadecimal válida.");
        if (CARGOS_PADRAO.some((cargo) => cargo.nome.toLowerCase() === nome.toLowerCase())) {
            return erro(res, 409, "Esse nome é reservado para um cargo padrão.");
        }

        const nomesCargos = await prisma.cargosEquipe.findMany({
            where: { equipeId: contexto.equipe.id },
            select: { nome: true }
        });
        if (nomesCargos.some((item) => item.nome.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR"))) {
            return erro(res, 409, "Já existe um cargo com esse nome nesta equipe.");
        }

        const permissoes = normalizarPermissoes(req.body.permissoes);
        if (!contexto.souDono && cargoExcedePermissoesDoAtor({ permissoes }, contexto.permissoes)) {
            return erro(res, 403, "O cargo não pode receber permissões superiores às suas.");
        }

        const cargo = await prisma.cargosEquipe.create({
            data: {
                equipeId: contexto.equipe.id,
                nome,
                descricao: descricao || "Cargo personalizado da equipe.",
                cor,
                permissoes,
                sistema: false
            }
        });

        return res.status(201).json({ mensagem: "Cargo criado com sucesso.", cargo });
    } catch (error) {
        console.error("Erro ao criar cargo:", error);
        return erro(res, 500, "Não foi possível criar o cargo.");
    }
}

export async function excluirCargo(req, res) {
    try {
        const contexto = await obterContextoEquipe(req.params.id, req.usuario.id);
        if (contexto.mensagem) return erro(res, contexto.status, contexto.mensagem);
        if (!pode(contexto, "gerenciarCargos")) return erro(res, 403, "Seu cargo não permite excluir cargos.");
        if (!idValido(req.params.cargoId)) return erro(res, 400, "ID de cargo inválido.");

        const cargo = await prisma.cargosEquipe.findFirst({
            where: { id: req.params.cargoId, equipeId: contexto.equipe.id }
        });
        if (!cargo) return erro(res, 404, "Cargo não encontrado.");
        if (cargo.sistema) return erro(res, 403, "Os cargos padrão não podem ser excluídos.");

        const quantidadeAtribuicoes = await prisma.equipeIntegrantes.count({
            where: { equipeId: contexto.equipe.id, cargoId: cargo.id }
        });
        if (quantidadeAtribuicoes > 0) {
            return erro(res, 409, "Esse cargo ainda está atribuído. Altere o cargo dos integrantes antes de excluí-lo.");
        }

        await prisma.cargosEquipe.delete({ where: { id: cargo.id } });
        return res.status(200).json({ mensagem: "Cargo excluído com sucesso." });
    } catch (error) {
        console.error("Erro ao excluir cargo:", error);
        return erro(res, 500, "Não foi possível excluir o cargo.");
    }
}