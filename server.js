import dotenv from "dotenv";

dotenv.config();

import app from "./src/app.js";
import { iniciarMQTT } from "./src/services/mqtt.service.js";

const PORT = process.env.PORT || 3000;

iniciarMQTT();

app.listen(PORT, () => {
  console.log(`Servidor rodando na http://localhost:${PORT}`);
});

