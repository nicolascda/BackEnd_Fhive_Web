import { randomUUID } from "crypto";
import prisma from "../data/prisma.js";

const MAX_LEITURAS = 60;
const MIN_LEITURAS = 10;
const AVISO_MODELO = "DADOS SIMULADOS: este gráfico foi criado para testes e não representa medições reais do aparelho.";
const ORIGEM_MODELO = "modelo_artificial";

function inteiroDentroDoLimite(valor, padrao, minimo, maximo) {
    if (valor === undefined || valor === null || valor === "") return padrao;
    const numero = Number(valor);
    if (!Number.isInteger(numero) || numero < minimo || numero > maximo) return null;
    return numero;
}

function textoOpcional(valor, limite = 80) {
    if (typeof valor !== "string") return undefined;
    const texto = valor.trim();
    return texto ? texto.slice(0, limite) : undefined;
}

function aleatorio(minimo, maximo) {
    return minimo + Math.random() * (maximo - minimo);
}

function validarObjectId(id) {
    return typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
}

function perfilDoDispositivo(dispositivo) {
    const descricao = `${dispositivo.tipo || ""} ${dispositivo.nome || ""}`.toLowerCase();

    if (descricao.includes("ar condicionado") || descricao.includes("ar-condicionado")) {
        return { minimoW: 450, maximoW: 1600, tensaoV: 220, variacao: 0.24 };
    }
    if (descricao.includes("tv") || descricao.includes("televis")) {
        return { minimoW: 45, maximoW: 180, tensaoV: 127, variacao: 0.20 };
    }
    if (descricao.includes("lâmpada") || descricao.includes("lampada")) {
        return { minimoW: 5, maximoW: 24, tensaoV: 127, variacao: 0.10 };
    }
    if (descricao.includes("ventilador")) {
        return { minimoW: 35, maximoW: 130, tensaoV: 127, variacao: 0.24 };
    }
    if (descricao.includes("geladeira") || descricao.includes("refrigerador")) {
        return { minimoW: 70, maximoW: 380, tensaoV: 220, variacao: 0.34 };
    }
    if (descricao.includes("computador") || descricao.includes("notebook")) {
        return { minimoW: 45, maximoW: 280, tensaoV: 127, variacao: 0.30 };
    }

    return { minimoW: 40, maximoW: 600, tensaoV: 220, variacao: 0.30 };
}

function gerarLeiturasModelo(dispositivo, quantidade, sessaoId) {
    const perfil = perfilDoDispositivo(dispositivo);
    const potenciaBase = aleatorio(perfil.minimoW, perfil.maximoW);
    const inicio = Date.now() - (quantidade - 1) * 60_000;

    return Array.from({ length: quantidade }, (_, indice) => {
        const onda = Math.sin(indice / 3.2) * perfil.variacao * 0.35;
        const ruido = aleatorio(-perfil.variacao * 0.55, perfil.variacao * 0.55);
        const pico = indice > 0 && indice % 11 === 0 ? aleatorio(0.08, 0.22) : 0;
        const fator = Math.max(0.35, 1 + onda + ruido + pico);
        const potenciaW = Number(
            Math.min(perfil.maximoW * 1.2, Math.max(perfil.minimoW * 0.6, potenciaBase * fator)).toFixed(2)
        );
        const energiaWh = Number((potenciaW / 60).toFixed(4));
        const correnteA = Number((potenciaW / perfil.tensaoV).toFixed(3));

        return {
            minuto: indice + 1,
            leitura_id: randomUUID(),
            sessao_id: sessaoId,
            timestamp: new Date(inicio + indice * 60_000).toISOString(),
            energy_wh: energiaWh,
            power_w: potenciaW,
            voltage: perfil.tensaoV,
            current: correnteA,
            origem: ORIGEM_MODELO,
            simulado: true
        };
    });
}

function resumirLeituras(leituras) {
    const somar = (itens) => Number(
        itens.reduce((total, item) => total + Number(item.energy_wh || 0), 0).toFixed(4)
    );

    return {
        consumoAcumulado: somar(leituras),
        consumo1Minuto: Number(leituras.at(-1)?.energy_wh || 0),
        consumo5Minutos: leituras.length >= 5 ? somar(leituras.slice(-5)) : null,
        consumo10Minutos: leituras.length >= 10 ? somar(leituras.slice(-10)) : null
    };
}

// A coleção continua sendo Telemetrias. O nome é apenas um alias de API
// para o Flutter não precisar mudar o contrato de /graficos-modelo.
function serializarGraficoModelo(telemetria) {
    if (!telemetria) return null;

    const { nomeGrafico, ...dados } = telemetria;
    return {
        ...dados,
        nome: nomeGrafico || "Gráfico modelo",
        tipoGrafico: "consumo_energia",
        aviso: telemetria.aviso || AVISO_MODELO
    };
}

function camposDoDispositivo() {
    return {
        id: true,
        nome: true,
        tipo: true,
        deviceId: true
    };
}

/** GET /graficos-modelo — lista sessões artificiais da coleção Telemetrias. */
export const listarGraficosModelo = async (req, res) => {
    try {
        const dispositivos = await prisma.dispositivos.findMany({
            where: { usuarioId: req.usuario.id },
            select: { id: true }
        });

        const idsDispositivos = dispositivos.map((item) => item.id);
        if (!idsDispositivos.length) return res.status(200).json([]);

        const telemetrias = await prisma.telemetrias.findMany({
            where: {
                origem: ORIGEM_MODELO,
                dispositivoId: { in: idsDispositivos }
            },
            orderBy: { periodoInicio: "desc" },
            include: {
                dispositivo: { select: camposDoDispositivo() }
            }
        });

        return res.status(200).json(telemetrias.map(serializarGraficoModelo));
    } catch (erro) {
        console.error("Erro ao listar gráficos modelo em Telemetrias:", erro);
        return res.status(500).json({ mensagem: "Não foi possível listar os gráficos modelo." });
    }
};

/** POST /graficos-modelo — gera dados artificiais e os salva em Telemetrias. */
export const criarGraficoModelo = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const dispositivoId = req.body?.dispositivoId;

        if (!validarObjectId(dispositivoId)) {
            return res.status(400).json({ mensagem: "Informe um ID MongoDB válido para o aparelho." });
        }

        const quantidadeLeituras = inteiroDentroDoLimite(
            req.body?.quantidadeLeituras,
            30,
            MIN_LEITURAS,
            MAX_LEITURAS
        );
        if (quantidadeLeituras === null) {
            return res.status(400).json({
                mensagem: `A quantidade de leituras deve ser um número inteiro entre ${MIN_LEITURAS} e ${MAX_LEITURAS}.`
            });
        }

        const dispositivo = await prisma.dispositivos.findFirst({
            where: { id: dispositivoId, usuarioId },
            select: camposDoDispositivo()
        });
        if (!dispositivo) {
            return res.status(404).json({ mensagem: "Aparelho não encontrado na sua conta." });
        }

        const sessaoId = `modelo-${randomUUID()}`;
        const leituras = gerarLeiturasModelo(dispositivo, quantidadeLeituras, sessaoId);
        const resumo = resumirLeituras(leituras);
        const nomeGrafico = textoOpcional(req.body?.nome, 80) || `Modelo - ${dispositivo.nome}`;
        const periodoInicio = new Date(Date.now() - (quantidadeLeituras - 1) * 60_000);

        const telemetria = await prisma.telemetrias.create({
            data: {
                sessaoId,
                periodoInicio,
                minutoAtual: quantidadeLeituras,
                consumo1Minuto: resumo.consumo1Minuto,
                consumoAcumulado: resumo.consumoAcumulado,
                consumo5Minutos: resumo.consumo5Minutos,
                consumo10Minutos: resumo.consumo10Minutos,
                finalizado: true,
                leituras,
                origem: ORIGEM_MODELO,
                nomeGrafico,
                aviso: AVISO_MODELO,
                dispositivoId: dispositivo.id
            },
            include: {
                dispositivo: { select: camposDoDispositivo() }
            }
        });

        return res.status(201).json({
            mensagem: "Gráfico modelo criado e salvo em Telemetrias.",
            origem: ORIGEM_MODELO,
            estimativa: true,
            aviso: AVISO_MODELO,
            grafico: serializarGraficoModelo(telemetria)
        });
    } catch (erro) {
        console.error("Erro ao criar gráfico modelo em Telemetrias:", erro);
        return res.status(500).json({ mensagem: "Não foi possível criar o gráfico modelo." });
    }
};

/** GET /graficos-modelo/:id — busca uma sessão artificial de Telemetrias. */
export const buscarGraficoModelo = async (req, res) => {
    try {
        const { id } = req.params;
        if (!validarObjectId(id)) {
            return res.status(400).json({ mensagem: "ID do gráfico modelo inválido." });
        }

        const telemetria = await prisma.telemetrias.findFirst({
            where: { id, origem: ORIGEM_MODELO }
        });
        if (!telemetria) {
            return res.status(404).json({ mensagem: "Gráfico modelo não encontrado." });
        }

        const dispositivo = await prisma.dispositivos.findFirst({
            where: { id: telemetria.dispositivoId, usuarioId: req.usuario.id },
            select: camposDoDispositivo()
        });
        if (!dispositivo) {
            return res.status(404).json({ mensagem: "Gráfico modelo não encontrado." });
        }

        return res.status(200).json(serializarGraficoModelo({
            ...telemetria,
            dispositivo
        }));
    } catch (erro) {
        console.error("Erro ao buscar gráfico modelo em Telemetrias:", erro);
        return res.status(500).json({ mensagem: "Não foi possível carregar o gráfico modelo." });
    }
};

/** DELETE /graficos-modelo/:id — apaga apenas a sessão artificial do próprio usuário. */
export const excluirGraficoModelo = async (req, res) => {
    try {
        const { id } = req.params;
        if (!validarObjectId(id)) {
            return res.status(400).json({ mensagem: "ID do gráfico modelo inválido." });
        }

        const telemetria = await prisma.telemetrias.findFirst({
            where: { id, origem: ORIGEM_MODELO },
            select: { id: true, dispositivoId: true }
        });
        if (!telemetria) {
            return res.status(404).json({ mensagem: "Gráfico modelo não encontrado." });
        }

        const dispositivo = await prisma.dispositivos.findFirst({
            where: { id: telemetria.dispositivoId, usuarioId: req.usuario.id },
            select: { id: true }
        });
        if (!dispositivo) {
            return res.status(404).json({ mensagem: "Gráfico modelo não encontrado." });
        }

        await prisma.telemetrias.delete({ where: { id: telemetria.id } });
        return res.status(200).json({ mensagem: "Gráfico modelo removido de Telemetrias com sucesso." });
    } catch (erro) {
        console.error("Erro ao excluir gráfico modelo de Telemetrias:", erro);
        return res.status(500).json({ mensagem: "Não foi possível excluir o gráfico modelo." });
    }
};