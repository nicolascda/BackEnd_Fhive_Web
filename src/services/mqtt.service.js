import mqtt from "mqtt";
import prisma from "../data/prisma.js";

const filasPorDispositivo = new Map();

let mqttClient;

export function iniciarMQTT() {
    mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL, {
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        clientId: "fhive-backend",
        reconnectPeriod: 5000,
        clean: true
    });

    mqttClient.on("connect", () => {
        console.log("Conectado ao broker MQTT.");

        mqttClient.subscribe(
            "fhive/devices/+/telemetry",
            { qos: 1 },
            (erro) => {
                if (erro) {
                    console.error("Erro ao se inscrever no tópico:", erro);
                    return;
                }

                console.log(
                    "Inscrito no tópico fhive/devices/+/telemetry"
                );
            }
        );
    });

    mqttClient.on("message", (topic, mensagem) => {
        try {
            const dados = JSON.parse(mensagem.toString());
            const deviceId = topic.split("/")[2];

            const filaAtual =
                filasPorDispositivo.get(deviceId) || Promise.resolve();

            const proximaFila = filaAtual
                .then(() => processarMensagem(deviceId, dados))
                .catch((erro) => {
                    console.error("Erro ao processar mensagem:", erro);
                });

            const filaFinal = proximaFila.finally(() => {
                if (filasPorDispositivo.get(deviceId) === filaFinal) {
                    filasPorDispositivo.delete(deviceId);
                }
            });

            filasPorDispositivo.set(deviceId, filaFinal);
        } catch (erro) {
            console.error("Erro ao interpretar mensagem MQTT:", erro);
        }
    });

    mqttClient.on("error", (erro) => {
        console.error("Erro no MQTT:", erro);
    });

    return mqttClient;
}

async function processarMensagem(deviceId, dados) {
    const dispositivo = await prisma.dispositivos.findUnique({
        where: { deviceId }
    });

    if (!dispositivo) {
        console.error(`Dispositivo ${deviceId} não encontrado.`);
        return;
    }

    const { sessao_id, ...leitura } = dados;

    const energia = Number(leitura.energy_wh);
    const sessaoId = sessao_id;
    const leituraId = leitura.leitura_id;

    if (
        !Number.isFinite(energia) ||
        !sessaoId ||
        !leituraId
    ) {
        console.error("Dados de telemetria inválidos.");
        return;
    }

    const telemetria = await prisma.telemetrias.findFirst({
        where: {
            dispositivoId: dispositivo.id,
            sessaoId,
            finalizado: false
        },
        orderBy: {
            periodoInicio: "desc"
        }
    });

    if (!telemetria) {
        await prisma.telemetrias.create({
            data: {
                sessaoId,
                minutoAtual: 1,
                consumo1Minuto: energia,
                consumoAcumulado: energia,
                consumo5Minutos: null,
                consumo10Minutos: null,
                finalizado: false,
                leituras: [leitura],
                dispositivoId: dispositivo.id
            }
        });
    } else {
        const leituras = Array.isArray(telemetria.leituras)
            ? [...telemetria.leituras]
            : [];

        const leituraDuplicada = leituras.some(
            (item) => item.leitura_id === leituraId
        );

        if (leituraDuplicada) {
            return;
        }

        const proximoMinuto = telemetria.minutoAtual + 1;

        leituras.push(leitura);

        const consumoAcumulado = leituras.reduce(
            (total, item) =>
                total + Number(item.energy_wh || 0),
            0
        );

        const consumo5Minutos =
            proximoMinuto >= 5
                ? leituras
                    .slice(0, 5)
                    .reduce(
                        (total, item) =>
                            total + Number(item.energy_wh || 0),
                        0
                    )
                : null;

        const consumo10Minutos =
            proximoMinuto >= 10
                ? leituras
                    .slice(0, 10)
                    .reduce(
                        (total, item) =>
                            total + Number(item.energy_wh || 0),
                        0
                    )
                : null;

        await prisma.telemetrias.update({
            where: { id: telemetria.id },
            data: {
                minutoAtual: proximoMinuto,
                consumo1Minuto: energia,
                consumoAcumulado,
                consumo5Minutos,
                consumo10Minutos,
                finalizado: proximoMinuto >= 10,
                leituras
            }
        });
    }

    await prisma.dispositivos.update({
        where: { id: dispositivo.id },
        data: {
            status: "online",
            lastSeenAt: new Date()
        }
    });

    console.log(
        `Dispositivo ${deviceId} processado - minuto ${leitura.minuto}`
    );
}