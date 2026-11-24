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
            senha,
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
                email: usuario.email,
                fotoPerfil: usuario.fotoPerfil
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
                email: usuario.email,
                fotoPerfil: usuario.fotoPerfil
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


export const obterPerfil = async (req, res) => {
    try {
        const usuario = await prisma.usuarios.findUnique({
            where: { id: req.usuario.id },
            select: {
                id: true,
                nome: true,
                email: true,
                fotoPerfil: true,
                createdAt: true
            }
        });

        if (!usuario) {
            return res.status(404).json({
                mensagem: "Usuário não encontrado."
            });
        }

        return res.status(200).json({ usuario });
    } catch (error) {
        console.error("Erro ao buscar perfil:", error);
        return res.status(500).json({
            mensagem: "Não foi possível carregar o perfil."
        });
    }
};

export const atualizarPerfil = async (req, res) => {
    try {
        const { nome, email, fotoPerfil, senhaAtual, novaSenha } = req.body;
        const usuarioId = req.usuario.id;

        if (typeof nome !== "string" || !nome.trim() || typeof email !== "string" || !email.trim()) {
            return res.status(400).json({
                mensagem: "Nome e e-mail são obrigatórios."
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        const emailExistente = await prisma.usuarios.findFirst({
            where: {
                email: emailNormalizado,
                NOT: { id: usuarioId }
            }
        });

        if (emailExistente) {
            return res.status(409).json({
                mensagem: "Este e-mail já está sendo usado por outra conta."
            });
        }

        if (fotoPerfil !== undefined && fotoPerfil !== null && typeof fotoPerfil !== "string") {
            return res.status(400).json({
                mensagem: "A foto de perfil informada é inválida."
            });
        }

        if (typeof fotoPerfil === "string" && fotoPerfil.length > 3000000) {
            return res.status(413).json({
                mensagem: "A foto de perfil deve ter no máximo 2 MB."
            });
        }

        const alterandoSenha = Boolean(senhaAtual || novaSenha);
        const dadosAtualizacao = {
            nome: nome.trim(),
            email: emailNormalizado,
            ...(fotoPerfil !== undefined ? { fotoPerfil: fotoPerfil || null } : {})
        };

        if (alterandoSenha) {
            if (typeof senhaAtual !== "string" || !senhaAtual || typeof novaSenha !== "string" || !novaSenha) {
                return res.status(400).json({
                    mensagem: "Informe a senha atual e a nova senha."
                });
            }

            if (novaSenha.length < 8) {
                return res.status(400).json({
                    mensagem: "A nova senha deve ter pelo menos 8 caracteres."
                });
            }

            const usuarioAtual = await prisma.usuarios.findUnique({
                where: { id: usuarioId }
            });

            if (!usuarioAtual) {
                return res.status(404).json({
                    mensagem: "Usuário não encontrado."
                });
            }

            const senhaValida = await bcrypt.compare(senhaAtual, usuarioAtual.senha);

            if (!senhaValida) {
                return res.status(400).json({
                    mensagem: "A senha atual está incorreta."
                });
            }

            dadosAtualizacao.senha = await bcrypt.hash(novaSenha, 10);
        }

        const usuario = await prisma.usuarios.update({
            where: { id: usuarioId },
            data: dadosAtualizacao,
            select: {
                id: true,
                nome: true,
                email: true,
                fotoPerfil: true,
                createdAt: true
            }
        });

        return res.status(200).json({
            mensagem: "Perfil atualizado com sucesso.",
            usuario
        });
    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
        return res.status(500).json({
            mensagem: "Não foi possível atualizar o perfil."
        });
    }
};
