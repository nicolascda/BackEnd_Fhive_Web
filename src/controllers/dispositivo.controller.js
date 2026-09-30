import prisma from "../data/prisma.js";
import { randomUUID } from "crypto";

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
                dispositivoId: dispositivo.id
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