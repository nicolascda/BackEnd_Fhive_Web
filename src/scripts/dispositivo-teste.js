import mqtt from "mqtt";
import dotenv from "dotenv";
import { randomUUID } from "crypto";

dotenv.config();

const DEVICE_ID = process.env.DEVICE_ID;
const INTERVALO_TESTE = 10000;
const TOTAL_MINUTOS = 10;
const SESSAO_ID = randomUUID();

const client = mqtt.connect(process.env.MQTT_BROKER_URL, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clientId: DEVICE_ID,
    reconnectPeriod: 5000,
    clean: true
});

let minutoAtual = 0;
let simulacaoIniciada = false;

client.on("connect", () => {
    console.log(`Dispositivo ${DEVICE_ID} conectado ao MQTT.`);

    if (simulacaoIniciada) {
        return;
    }

    simulacaoIniciada = true;
    enviarDados();
});

function enviarDados() {
    const proximoMinuto = minutoAtual + 1;

    const powerW = Number(
        (Math.random() * 500 + 100).toFixed(2)
    );

    const energyWh = Number(
        (powerW / 60).toFixed(4)
    );

    const dados = {
        minuto: proximoMinuto,
        leitura_id: randomUUID(),
        sessao_id: SESSAO_ID,
        power_w: powerW,
        energy_wh: energyWh,
        voltage: 220,
        current: Number((powerW / 220).toFixed(2))
    };

    const topic =
        `fhive/devices/${DEVICE_ID}/telemetry`;

    client.publish(
        topic,
        JSON.stringify(dados),
        { qos: 1 },
        (erro) => {
            if (erro) {
                console.error("Erro ao publicar:", erro);
                return;
            }

            // Só avança o minuto depois que a publicação foi confirmada.
            minutoAtual = proximoMinuto;

            console.log(
                `Minuto ${minutoAtual}:`,
                dados
            );

            if (minutoAtual >= TOTAL_MINUTOS) {
                console.log("Simulação finalizada.");

                client.end(false, () => {
                    console.log("Dispositivo desconectado.");
                });

                return;
            }

            setTimeout(
                enviarDados,
                INTERVALO_TESTE
            );
        }
    );
}

client.on("error", (erro) => {
    console.error("Erro no dispositivo MQTT:", erro);
});