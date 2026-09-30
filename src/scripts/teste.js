import dotenv from "dotenv";

dotenv.config();

console.log("URL:", process.env.MQTT_BROKER_URL);
console.log("USERNAME:", process.env.MQTT_USERNAME);