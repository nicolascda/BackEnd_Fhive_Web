import dotenv from "dotenv";

dotenv.config();

import app from "./src/app.js";
import { iniciarMQTT } from "./src/services/mqtt.service.js";

const PORT = process.env.PORT || 3000;

const mqttConfigurado = Boolean(
    process.env.MQTT_BROKER_URL?.trim() &&
    process.env.MQTT_USERNAME?.trim() &&
    process.env.MQTT_PASSWORD?.trim()
);

app.listen(PORT, () => {
  console.log(`Servidor rodando na http://localhost:${PORT}`);
});

// O MQTT é iniciado separadamente.
if (mqttConfigurado) {
    try {
        iniciarMQTT();
    } catch (erro) {
        console.error(
            "Não foi possível iniciar o MQTT:",
            erro.message
        );

        console.log(
            "O backend HTTP continuará funcionando sem o MQTT."
        );
    }
} else {
    console.log(
        "MQTT não configurado. Inicialização ignorada."
    );
}

