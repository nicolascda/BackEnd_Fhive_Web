import dotenv from "dotenv";

dotenv.config();

import app from "./src/app.js";
import { iniciarMQTT } from "./src/services/mqtt.service.js";

const PORT = process.env.PORT || 3000;

const mqttConfigurado =
  process.env.MQTT_BROKER_URL &&
  process.env.MQTT_USERNAME &&
  process.env.MQTT_PASSWORD;

if (mqttConfigurado) {
  iniciarMQTT();
} else {
  console.log("MQTT não configurado. Inicialização do MQTT ignorada.");
}

app.listen(PORT, () => {
  console.log(`Servidor rodando na http://localhost:${PORT}`);
});