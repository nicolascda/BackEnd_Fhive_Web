import prisma from "../data/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import {
    criarCadastroPendente,
    buscarCadastroPendente,
    removerCadastroPendente
} from "../services/codigo.service.js";

import {
    enviarCodigoConfirmacao
} from "../services/email.service.js";

// Cadastrar usuário
export const criarUsuario = async (req, res) => {
    try {
        const {
            nome,
            email,
            senha
        } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({
                mensagem:
                    "Nome, e-mail e senha são obrigatórios."
            });
        }

        const emailNormalizado =
            email.trim().toLowerCase();

        const usuarioExistente =
            await prisma.usuarios.findUnique({
                where: {
                    email: emailNormalizado
                }
            });

        if (usuarioExistente) {
            return res.status(409).json({
                mensagem:
                    "Este e-mail já está cadastrado."
            });
        }

        const senhaHash =
            await bcrypt.hash(senha, 10);

        const codigo = criarCadastroPendente(
            emailNormalizado,
            {
                nome: nome.trim(),
                senha: senhaHash
            }
        );

        try {
            await enviarCodigoConfirmacao(
                emailNormalizado,
                nome.trim(),
                codigo
            );
        } catch (error) {
            removerCadastroPendente(
                emailNormalizado
            );

            throw error;
        }

        return res.status(200).json({
            mensagem:
                "Código de confirmação enviado para o e-mail."
        });

    } catch (error) {
        console.error(
            "Erro ao iniciar cadastro:",
            error
        );

        return res.status(500).json({
            mensagem:
                "Erro ao iniciar cadastro.",
            erro: error.message
        });
    }
};

export const confirmarEmail = async (req, res) => {
    try {
        const {
            email,
            codigo
        } = req.body;

        if (!email || !codigo) {
            return res.status(400).json({
                mensagem:
                    "E-mail e código são obrigatórios."
            });
        }

        const emailNormalizado =
            email.trim().toLowerCase();

        const cadastro =
            buscarCadastroPendente(
                emailNormalizado
            );

        if (!cadastro) {
            return res.status(400).json({
                mensagem:
                    "Código inexistente ou expirado."
            });
        }

        if (cadastro.codigo !== codigo) {
            return res.status(400).json({
                mensagem:
                    "Código de confirmação inválido."
            });
        }

        const usuarioExistente =
            await prisma.usuarios.findUnique({
                where: {
                    email: emailNormalizado
                }
            });

        if (usuarioExistente) {
            removerCadastroPendente(
                emailNormalizado
            );

            return res.status(409).json({
                mensagem:
                    "Este e-mail já está cadastrado."
            });
        }

        const usuario =
            await prisma.usuarios.create({
                data: {
                    nome: cadastro.nome,
                    email: emailNormalizado,
                    senha: cadastro.senha
                }
            });

        removerCadastroPendente(
            emailNormalizado
        );

        return res.status(201).json({
            mensagem:
                "Cadastro confirmado com sucesso.",
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });

    } catch (error) {
        console.error(
            "Erro ao confirmar e-mail:",
            error
        );

        return res.status(500).json({
            mensagem:
                "Erro ao confirmar e-mail.",
            erro: error.message
        });
    }
};

export const loginUsuario = async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                mensagem: "Nome ou e-mail e senha são obrigatórios."
            });
        }

        const valor = email.trim().toLowerCase();

        const usuario = await prisma.usuarios.findFirst({
            where: {
                email: valor
            }
        });

        if (!usuario) {
            return res.status(401).json({
                mensagem: "Nome ou e-mail ou senha estão inválidos."
            });
        }

        const senhaValida = await bcrypt.compare(
            senha,
            usuario.senha
        );

        if (!senhaValida) {
            return res.status(401).json({
                mensagem: "Nome ou e-mail ou senha inválidos."
            });
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                email: usuario.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        return res.status(200).json({
            mensagem: "Login realizado com sucesso!",
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });

    } catch (error) {
        console.error("Erro no login:", error);

        return res.status(500).json({
            erro: "Erro ao realizar login."
        });
    }
};


export const listarUsuarios = async (req, res) => {
    try {
        
        const usuarios = await prisma.usuarios.findMany({
            select: {
                id: true,
                nome: true,
                email: true,
                createdAt: true
            }
        });

        return res.status(200).json(usuarios);
    } catch (error) {
        return res.status(500).json({ erro: error.message });
    }
};
