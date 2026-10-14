import { randomBytes } from "node:crypto";
import prisma from "../data/prisma.js";

const setoresValidos = ["Industrial", "Educação", "Saúde", "Outros"];

const gerarCodigoEquipe = async () => {
    let codigo;

    do {
        codigo = randomBytes(4).toString("hex").toUpperCase();
    } while (await prisma.equipes.findUnique({ where: { codigo } }));

    return codigo;
};

const validarImagem = (imagem) =>
    imagem === undefined ||
    imagem === null ||
    (typeof imagem === "string" && imagem.length <= 3000000);

export const criarEquipe = async (req, res) => {
    try {
        const {
            nome,
            descricao,
            imagemFundo,
            logo,
            plano,
            setor,
            limiteIntegrantes
        } = req.body;

        if (typeof nome !== "string" || !nome.trim() || typeof setor !== "string") {
            return res.status(400).json({
                mensagem: "Nome e setor da equipe são obrigatórios."
            });
        }

        if (nome.trim().length > 80) {
            return res.status(400).json({
                mensagem: "O nome da equipe deve ter no máximo 80 caracteres."
            });
        }

        if (descricao !== undefined && descricao !== null && typeof descricao !== "string") {
            return res.status(400).json({
                mensagem: "A descrição da equipe é inválida."
            });
        }

        if (!setoresValidos.includes(setor)) {
            return res.status(400).json({
                mensagem: "Selecione um setor válido."
            });
        }

        if (!Number.isInteger(limiteIntegrantes) || limiteIntegrantes < 5 || limiteIntegrantes > 35 || limiteIntegrantes % 5 !== 0) {
            return res.status(400).json({
                mensagem: "O limite de integrantes deve estar entre 5 e 35, em intervalos de 5."
            });
        }

        if (!validarImagem(imagemFundo) || !validarImagem(logo)) {
            return res.status(413).json({
                mensagem: "Cada imagem deve ter no máximo 2 MB."
            });
        }

        const usuarioId = req.usuario.id;
        const codigo = await gerarCodigoEquipe();

        const equipe = await prisma.equipes.create({
            data: {
                nome: nome.trim(),
                descricao: typeof descricao === "string" ? descricao.trim() || null : null,
                imagemFundo: imagemFundo || null,
                logo: logo || null,
                plano: typeof plano === "string" && plano.trim() ? plano.trim() : "Básico",
                setor,
                limiteIntegrantes,
                codigo,
                usuarioId
            }
        });

        return res.status(201).json({
            mensagem: "Equipe criada com sucesso.",
            equipe
        });
    } catch (error) {
        console.error("Erro ao criar equipe:", error);
        return res.status(500).json({
            mensagem: "Não foi possível criar a equipe. Tente novamente."
        });
    }
};

export const listarEquipes = async (req, res) => {
    try {
        const equipes = await prisma.equipes.findMany({
            where: { usuarioId: req.usuario.id },
            orderBy: { createdAt: "desc" }
        });

        return res.status(200).json(equipes);
    } catch (error) {
        console.error("Erro ao listar equipes:", error);
        return res.status(500).json({
            mensagem: "Não foi possível carregar as equipes."
        });
    }
};

export const excluirEquipe = async (req, res) => {
    try {
        const equipe = await prisma.equipes.findFirst({
            where: {
                id: req.params.id,
                usuarioId: req.usuario.id
            }
        });

        if (!equipe) {
            return res.status(404).json({
                mensagem: "Equipe não encontrada."
            });
        }

        await prisma.equipes.delete({ where: { id: equipe.id } });

        return res.status(200).json({
            mensagem: "Equipe excluída com sucesso."
        });
    } catch (error) {
        console.error("Erro ao excluir equipe:", error);
        return res.status(500).json({
            mensagem: "Não foi possível excluir a equipe."
        });
    }
};
