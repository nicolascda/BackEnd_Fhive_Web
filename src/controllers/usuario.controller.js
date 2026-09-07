import prisma from "../data/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Cadastrar usuário
export const criarUsuario = async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({
                mensagem: "Todos os campos são obrigatórios."
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        const usuarioExiste = await prisma.usuarios.findUnique({
            where: {
                email: emailNormalizado
            }
        });

        if (usuarioExiste) {
            return res.status(400).json({
                mensagem: "Este e-mail já está em uso."
            });
        }

        const senhaCriptografada = await bcrypt.hash(senha, 10);

        const novoUsuario = await prisma.usuarios.create({
            data: {
                nome,
                email: emailNormalizado,
                senha: senhaCriptografada
            }
        });

        return res.status(201).json({
            id: novoUsuario.id,
            mensagem: "Usuário cadastrado com sucesso!"
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            erro: "Erro ao cadastrar usuário."
        });
    }
};

export const loginUsuario = async (req, res) => {
    try {
        const { identificador, senha } = req.body;

        if (!identificador || !senha) {
            return res.status(400).json({
                mensagem: "Nome ou e-mail e senha são obrigatórios."
            });
        }

        const valor = identificador.trim();

        const usuario = await prisma.usuarios.findFirst({
            where: {
                OR: [
                    {
                        email: valor
                    },
                    {
                        nome: valor
                    }
                ]
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
