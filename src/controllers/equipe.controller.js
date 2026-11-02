import { randomBytes } from "node:crypto";
import prisma from "../data/prisma.js";
import {
    erro,
    idValido,
    contarIntegrantes,
    garantirCargosPadrao,
    obterContextoEquipe,
    pode,
    montarResumoEquipe,
    obterLimiteDoPlano
} from "../services/equipe.service.js";

const SETORES_VALIDOS = ["Industrial", "Educação", "Saúde", "Outros"];
const LIMITE_MINIMO = 5;
const INTERVALO_LIMITE = 5;

async function gerarCodigoEquipe() {
    let codigo;
    do {
        codigo = randomBytes(4).toString("hex").toUpperCase();
    } while (await prisma.equipes.findUnique({ where: { codigo } }));
    return codigo;
}

function validarLimite(plano, limite) {
    const maximo = obterLimiteDoPlano(plano);
    if (!maximo) return `O plano ${plano} não está disponível.`;
    if (!Number.isInteger(limite) || limite < LIMITE_MINIMO || limite > maximo || limite % INTERVALO_LIMITE !== 0) {
        return `O limite deve ser de ${LIMITE_MINIMO} até ${maximo} integrantes, em intervalos de ${INTERVALO_LIMITE}.`;
    }
    return null;
}

export async function criarEquipe(req, res) {
    try {
        const { nome, descricao, imagemFundo, logo, plano = "Básico", setor, limiteIntegrantes } = req.body;

        if (typeof nome !== "string" || !nome.trim() || nome.trim().length > 80) {
            return erro(res, 400, "Informe um nome de equipe com até 80 caracteres.");
        }
        if (!SETORES_VALIDOS.includes(setor)) return erro(res, 400, "Selecione um setor válido.");
        if (descricao !== undefined && descricao !== null && typeof descricao !== "string") {
            return erro(res, 400, "A descrição da equipe é inválida.");
        }
        const erroLimite = validarLimite(plano, limiteIntegrantes);
        if (erroLimite) return erro(res, 400, erroLimite);
        if ((imagemFundo && (typeof imagemFundo !== "string" || imagemFundo.length > 3000000)) ||
            (logo && (typeof logo !== "string" || logo.length > 3000000))) {
            return erro(res, 413, "Cada imagem deve ter no máximo 2 MB.");
        }

        const codigo = await gerarCodigoEquipe();
        const equipe = await prisma.$transaction(async (tx) => {
            const criada = await tx.equipes.create({
                data: {
                    nome: nome.trim(),
                    descricao: typeof descricao === "string" ? descricao.trim() || null : null,
                    imagemFundo: imagemFundo || null,
                    logo: logo || null,
                    plano,
                    setor,
                    limiteIntegrantes,
                    codigo,
                    usuarioId: req.usuario.id
                }
            });

            await garantirCargosPadrao(criada.id, req.usuario.id, tx);
            return criada;
        });

        return res.status(201).json({
            mensagem: "Equipe criada com sucesso.",
            equipe: {
                ...equipe,
                quantidadeIntegrantes: 1,
                limitePlano: obterLimiteDoPlano(plano),
                souDono: true,
                meuCargo: "Líder"
            }
        });
    } catch (error) {
        console.error("Erro ao criar equipe:", error);
        return erro(res, 500, "Não foi possível criar a equipe.");
    }
}

export async function listarEquipes(req, res) {
    try {
        const usuarioId = req.usuario.id;
        const [equipesProprias, participacoes] = await Promise.all([
            prisma.equipes.findMany({ where: { usuarioId }, orderBy: { createdAt: "desc" } }),
            prisma.equipeIntegrantes.findMany({
                where: { usuarioId },
                include: { equipe: true }
            })
        ]);

        const equipesPorId = new Map();
        equipesProprias.forEach((equipe) => equipesPorId.set(equipe.id, equipe));
        participacoes.forEach(({ equipe }) => {
            if (equipe) equipesPorId.set(equipe.id, equipe);
        });

        const resultado = await Promise.all(
            [...equipesPorId.values()]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((equipe) => montarResumoEquipe(equipe, usuarioId))
        );

        return res.status(200).json(resultado);
    } catch (error) {
        console.error("Erro ao listar equipes:", error);
        return erro(res, 500, "Não foi possível carregar as equipes.");
    }
}

export async function obterEquipe(req, res) {
    try {
        const contexto = await obterContextoEquipe(req.params.id, req.usuario.id);
        if (contexto.mensagem) return erro(res, contexto.status, contexto.mensagem);

        const quantidadeIntegrantes = await contarIntegrantes(contexto.equipe.id);
        const limitePlano = obterLimiteDoPlano(contexto.equipe.plano) ?? contexto.equipe.limiteIntegrantes;

        return res.status(200).json({
            equipe: {
                ...contexto.equipe,
                limiteIntegrantes: Math.min(contexto.equipe.limiteIntegrantes, limitePlano)
            },
            quantidadeIntegrantes,
            limitePlano,
            souDono: contexto.souDono,
            meuCargo: contexto.souDono ? "Líder" : contexto.participacao.cargo.nome,
            minhasPermissoes: contexto.permissoes
        });
    } catch (error) {
        console.error("Erro ao obter equipe:", error);
        return erro(res, 500, "Não foi possível carregar a equipe.");
    }
}

export async function atualizarEquipe(req, res) {
    try {
        const contexto = await obterContextoEquipe(req.params.id, req.usuario.id);
        if (contexto.mensagem) return erro(res, contexto.status, contexto.mensagem);
        if (!pode(contexto, "configurarEquipe")) return erro(res, 403, "Seu cargo não permite configurar esta equipe.");

        const { nome, descricao, setor, limiteIntegrantes, imagemFundo, logo } = req.body;
        if (nome !== undefined && (typeof nome !== "string" || !nome.trim() || nome.trim().length > 80)) {
            return erro(res, 400, "O nome deve conter entre 1 e 80 caracteres.");
        }
        if (setor !== undefined && !SETORES_VALIDOS.includes(setor)) return erro(res, 400, "Selecione um setor válido.");
        if (descricao !== undefined && descricao !== null && typeof descricao !== "string") return erro(res, 400, "A descrição é inválida.");
        if ((imagemFundo !== undefined && imagemFundo !== null && (typeof imagemFundo !== "string" || imagemFundo.length > 3000000)) ||
            (logo !== undefined && logo !== null && (typeof logo !== "string" || logo.length > 3000000))) {
            return erro(res, 413, "Cada imagem deve ter no máximo 2 MB.");
        }

        const limitePlano = obterLimiteDoPlano(contexto.equipe.plano);
        if (!limitePlano) return erro(res, 400, "O plano desta equipe não está configurado.");
        const limiteAtual = Math.min(contexto.equipe.limiteIntegrantes, limitePlano);
        const limiteNovo = limiteIntegrantes ?? limiteAtual;
        const erroLimite = validarLimite(contexto.equipe.plano, limiteNovo);
        if (erroLimite) return erro(res, 400, erroLimite);

        const quantidade = await contarIntegrantes(contexto.equipe.id);
        if (limiteNovo < quantidade) {
            return erro(res, 409, `A equipe possui ${quantidade} integrante(s). Remova integrantes antes de reduzir o limite.`);
        }

        const atualizada = await prisma.equipes.update({
            where: { id: contexto.equipe.id },
            data: {
                ...(nome !== undefined ? { nome: nome.trim() } : {}),
                ...(descricao !== undefined ? { descricao: descricao?.trim() || null } : {}),
                ...(setor !== undefined ? { setor } : {}),
                ...((limiteIntegrantes !== undefined || contexto.equipe.limiteIntegrantes !== limiteAtual)
                    ? { limiteIntegrantes: limiteNovo }
                    : {}),
                ...(imagemFundo !== undefined ? { imagemFundo: imagemFundo || null } : {}),
                ...(logo !== undefined ? { logo: logo || null } : {})
            }
        });

        return res.status(200).json({
            mensagem: "Equipe atualizada com sucesso.",
            equipe: { ...atualizada, quantidadeIntegrantes: quantidade, limitePlano }
        });
    } catch (error) {
        console.error("Erro ao atualizar equipe:", error);
        return erro(res, 500, "Não foi possível atualizar a equipe.");
    }
}

export async function excluirEquipe(req, res) {
    try {
        if (!idValido(req.params.id)) return erro(res, 400, "ID de equipe inválido.");
        const equipe = await prisma.equipes.findFirst({
            where: { id: req.params.id, usuarioId: req.usuario.id }
        });
        if (!equipe) return erro(res, 404, "Equipe não encontrada ou você não é o líder.");

        // Só removemos vínculos e cargos. Máquinas/rotinas ainda pertencem ao usuário,
        // não à equipe, no schema atual, então não devem ser apagadas aqui.
        await prisma.$transaction([
            prisma.equipeIntegrantes.deleteMany({ where: { equipeId: equipe.id } }),
            prisma.cargosEquipe.deleteMany({ where: { equipeId: equipe.id } }),
            prisma.equipes.delete({ where: { id: equipe.id } })
        ]);

        return res.status(200).json({ mensagem: "Equipe excluída com sucesso." });
    } catch (error) {
        console.error("Erro ao excluir equipe:", error);
        return erro(res, 500, "Não foi possível excluir a equipe.");
    }
}