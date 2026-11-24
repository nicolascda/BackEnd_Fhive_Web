import prisma from "../data/prisma.js";
import { randomUUID } from "crypto";
import { isIP } from "node:net";

export const criarDispositivo = async (req, res) => {
    try {
        const { nome, tipo } = req.body;

        if (!nome || !tipo) {
            return res.status(400).json({
                mensagem: "Nome e tipo do dispositivo são obrigatórios."
            });
        }

        const usuarioId = req.usuario.id;

        const deviceId = `fhive-${randomUUID()}`;

        const dispositivo = await prisma.dispositivos.create({
            data: {
                deviceId,
                nome: nome.trim(),
                tipo: tipo.trim(),
                usuarioId
            }
        });

        return res.status(201).json({
            mensagem: "Dispositivo criado com sucesso.",
            dispositivo
        });

    } catch (error) {
        console.error("Erro ao criar dispositivo:", error);

        return res.status(500).json({
            erro: "Erro ao criar dispositivo."
        });
    }
};

export const listarDispositivos = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        const dispositivos = await prisma.dispositivos.findMany({
            where: {
                usuarioId
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return res.status(200).json(dispositivos);

    } catch (error) {
        console.error("Erro ao listar dispositivos:", error);

        return res.status(500).json({
            erro: "Erro ao listar dispositivos."
        });
    }
};

export const buscarDispositivo = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id;

        const dispositivo = await prisma.dispositivos.findFirst({
            where: {
                id,
                usuarioId
            }
        });

        if (!dispositivo) {
            return res.status(404).json({
                mensagem: "Dispositivo não encontrado."
            });
        }

        return res.status(200).json(dispositivo);

    } catch (error) {
        console.error("Erro ao buscar dispositivo:", error);

        return res.status(500).json({
            erro: "Erro ao buscar dispositivo."
        });
    }
};

export const listarTelemetrias = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id;

        const dispositivo = await prisma.dispositivos.findFirst({
            where: {
                id,
                usuarioId
            }
        });

        if (!dispositivo) {
            return res.status(404).json({
                mensagem: "Dispositivo não encontrado."
            });
        }

        const telemetrias = await prisma.telemetrias.findMany({
            where: {
                dispositivoId: dispositivo.id,
                // Não mistura sessões artificiais na consulta padrão de telemetria real.
                // origem: null também inclui documentos antigos, criados antes deste campo existir.
                OR: [
                    { origem: "mqtt" },
                    { origem: null }
                ]
            },
            orderBy: {
                periodoInicio: "desc"
            }
        });

        return res.status(200).json(telemetrias);

    } catch (error) {
        console.error(
            "Erro ao listar telemetrias:",
            error
        );

        return res.status(500).json({
            erro: "Erro ao listar telemetrias."
        });
    }
};

const ipv4Privado = (ip) => {
    if (typeof ip !== "string" || isIP(ip) !== 4) return false;

    const [a, b] = ip.split(".").map(Number);
    return a === 10 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168);
};

const buscarDispositivoDoUsuario = async (id, usuarioId) => {
    return prisma.dispositivos.findFirst({
        where: { id, usuarioId }
    });
};

export const buscarControleDispositivo = async (req, res) => {
    try {
        const dispositivo = await buscarDispositivoDoUsuario(
            req.params.id,
            req.usuario.id
        );

        if (!dispositivo) {
            return res.status(404).json({ mensagem: "Dispositivo não encontrado." });
        }

        if (!dispositivo.controleProvedor) {
            return res.status(200).json({ controle: null });
        }

        return res.status(200).json({
            controle: {
                provedor: dispositivo.controleProvedor,
                ip: dispositivo.controleIp,
                nome: dispositivo.controleNome,
                modelo: dispositivo.controleModelo,
                pareadoEm: dispositivo.controlePareadoEm
            }
        });
    } catch (error) {
        console.error("Erro ao consultar vínculo de controle:", error);
        return res.status(500).json({ mensagem: "Não foi possível consultar a configuração de controle." });
    }
};

export const vincularControleDispositivo = async (req, res) => {
    try {
        const { provedor, ip, nome, modelo } = req.body ?? {};
        const dispositivo = await buscarDispositivoDoUsuario(
            req.params.id,
            req.usuario.id
        );

        if (!dispositivo) {
            return res.status(404).json({ mensagem: "Dispositivo não encontrado." });
        }

        const tipo = String(dispositivo.tipo ?? "").trim().toLowerCase();
        if (!["tv", "televisão", "televisao"].includes(tipo)) {
            return res.status(400).json({ mensagem: "A integração Samsung IP Control está disponível somente para aparelhos do tipo TV." });
        }

        if (provedor !== "samsung_ip_control") {
            return res.status(400).json({ mensagem: "Provedor de controle não suportado." });
        }

        const ipNormalizado = typeof ip === "string" ? ip.trim() : "";
        if (!ipv4Privado(ipNormalizado)) {
            return res.status(400).json({ mensagem: "Informe um endereço IPv4 privado válido da mesma rede local da televisão." });
        }

        if (nome != null && (typeof nome !== "string" || nome.length > 100)) {
            return res.status(400).json({ mensagem: "O nome da televisão deve ter no máximo 100 caracteres." });
        }

        if (modelo != null && (typeof modelo !== "string" || modelo.length > 100)) {
            return res.status(400).json({ mensagem: "O modelo da televisão deve ter no máximo 100 caracteres." });
        }

        const atualizado = await prisma.dispositivos.update({
            where: { id: dispositivo.id },
            data: {
                controleProvedor: provedor,
                controleIp: ipNormalizado,
                controleNome: typeof nome === "string" ? nome.trim() : null,
                controleModelo: typeof modelo === "string" ? modelo.trim() : null,
                controlePareadoEm: new Date()
            }
        });

        return res.status(200).json({
            mensagem: "Televisão vinculada ao aparelho FHIVE.",
            controle: {
                provedor: atualizado.controleProvedor,
                ip: atualizado.controleIp,
                nome: atualizado.controleNome,
                modelo: atualizado.controleModelo,
                pareadoEm: atualizado.controlePareadoEm
            }
        });
    } catch (error) {
        console.error("Erro ao vincular controle do dispositivo:", error);
        return res.status(500).json({ mensagem: "Não foi possível salvar o vínculo da televisão." });
    }
};

export const desvincularControleDispositivo = async (req, res) => {
    try {
        const dispositivo = await buscarDispositivoDoUsuario(
            req.params.id,
            req.usuario.id
        );

        if (!dispositivo) {
            return res.status(404).json({ mensagem: "Dispositivo não encontrado." });
        }

        await prisma.dispositivos.update({
            where: { id: dispositivo.id },
            data: {
                controleProvedor: null,
                controleIp: null,
                controleNome: null,
                controleModelo: null,
                controlePareadoEm: null
            }
        });

        return res.status(200).json({ mensagem: "Controle local desvinculado do aparelho." });
    } catch (error) {
        console.error("Erro ao desvincular controle do dispositivo:", error);
        return res.status(500).json({ mensagem: "Não foi possível desvincular o controle da televisão." });
    }
};