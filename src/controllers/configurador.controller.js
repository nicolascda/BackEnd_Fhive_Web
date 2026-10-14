import prisma from "../data/prisma.js";
import bcrypt from "bcrypt";

import {
    criarRecuperacaoPendente,
    buscarRecuperacaoPendente,
    registrarTentativaRecuperacao,
    removerRecuperacaoPendente
} from "../services/codigo.service.js";

import {
    enviarCodigoRecuperacaoSenha
} from "../services/email.service.js";

export const solicitarRecuperacaoSenha = async (req, res) => {
    const mensagem =
        "Se o e-mail estiver cadastrado, você receberá um código para redefinir sua senha. O código é válido por 1 hora.";

    try {
        const { email } = req.body;

        if (typeof email !== "string" || !email.trim()) {
            return res.status(400).json({
                mensagem: "Informe um e-mail válido."
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        const usuario = await prisma.usuarios.findUnique({
            where: {
                email: emailNormalizado
            }
        });

        if (!usuario) {
            return res.status(200).json({
                mensagem
            });
        }

        const codigo = criarRecuperacaoPendente(
            emailNormalizado,
            usuario.id
        );

        try {
            await enviarCodigoRecuperacaoSenha(
                emailNormalizado,
                usuario.nome,
                codigo
            );
        } catch (error) {
            removerRecuperacaoPendente(emailNormalizado);

            console.error(
                "Erro ao enviar código de recuperação:",
                error
            );
        }

        return res.status(200).json({
            mensagem
        });
    } catch (error) {
        console.error(
            "Erro ao solicitar recuperação de senha:",
            error
        );

        return res.status(500).json({
            mensagem:
                "Não foi possível processar a solicitação. Tente novamente."
        });
    }
};

export const verificarCodigoRecuperacao = async (req, res) => {
    try {
        const { email, codigo } = req.body;

        if (typeof email !== "string" || !email.trim() || codigo === undefined || codigo === null || !String(codigo).trim()) {
            return res.status(400).json({
                mensagem: "E-mail e código de recuperação são obrigatórios."
            });
        }

        const emailNormalizado = email.trim().toLowerCase();
        const codigoRecebido = String(codigo).trim();
        const recuperacao = buscarRecuperacaoPendente(emailNormalizado);

        if (!recuperacao) {
            return res.status(400).json({
                mensagem: "Código de recuperação inexistente ou expirado."
            });
        }

        if (recuperacao.codigo !== codigoRecebido) {
            const limiteAtingido = registrarTentativaRecuperacao(emailNormalizado);
            return res.status(400).json({
                mensagem: limiteAtingido
                    ? "Limite de tentativas atingido. Solicite um novo código."
                    : "Código de recuperação inválido."
            });
        }

        return res.status(200).json({
            mensagem: "Código de recuperação válido."
        });
    } catch (error) {
        console.error("Erro ao verificar código de recuperação:", error);
        return res.status(500).json({
            mensagem: "Não foi possível verificar o código. Tente novamente."
        });
    }
};

export const redefinirSenha = async (req, res) => {
    try {
        const {
            email,
            codigo,
            novaSenha
        } = req.body;

        if (
            typeof email !== "string" ||
            !email.trim() ||
            codigo === undefined ||
            codigo === null ||
            typeof novaSenha !== "string" ||
            !novaSenha
        ) {
            return res.status(400).json({
                mensagem:
                    "E-mail, código e nova senha são obrigatórios."
            });
        }

        const emailNormalizado = email.trim().toLowerCase();
        const codigoRecebido = String(codigo).trim();

        const recuperacao = buscarRecuperacaoPendente(
            emailNormalizado
        );

        if (!recuperacao) {
            return res.status(400).json({
                mensagem:
                    "Código de recuperação inexistente ou expirado."
            });
        }

        if (recuperacao.codigo !== codigoRecebido) {
            const limiteAtingido =
                registrarTentativaRecuperacao(emailNormalizado);

            return res.status(400).json({
                mensagem: limiteAtingido
                    ? "Limite de tentativas atingido. Solicite um novo código."
                    : "Código de recuperação inválido."
            });
        }

        const senhaHash = await bcrypt.hash(novaSenha, 10);

        await prisma.usuarios.update({
            where: {
                id: recuperacao.usuarioId
            },
            data: {
                senha: senhaHash
            }
        });

        removerRecuperacaoPendente(emailNormalizado);

        return res.status(200).json({
            mensagem: "Senha redefinida com sucesso."
        });
    } catch (error) {
        console.error(
            "Erro ao redefinir senha:",
            error
        );

        return res.status(500).json({
            mensagem:
                "Não foi possível redefinir a senha. Tente novamente."
        });
    }
};