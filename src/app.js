import express from "express";
import cors from "cors";

import usuarioRoutes from "./routes/usuario.route.js";
import dispositivoRoutes from "./routes/dispositivo.route.js";
import rotinaRoutes from "./routes/rotina.route.js";
import gerenciadorRoutes from "./routes/configurador.route.js";
import equipeRoutes from "./routes/equipe.route.js";
import equipeIntegranteRoutes from "./routes/equipeIntegrante.route.js";
import cargoRoutes from "./routes/cargo.route.js";

const app = express();


app.use(express.json({ limit: "7mb" })); // Obrigatório para ler o req.body
app.use(cors());


app.use("/usuarios", usuarioRoutes);
app.use("/dispositivos", dispositivoRoutes);
app.use("/rotinas", rotinaRoutes);
app.use("/usuarios", gerenciadorRoutes);
app.use("/equipes", equipeRoutes);
app.use("/equipes", equipeIntegranteRoutes);
app.use("/equipes", cargoRoutes);


app.get("/", (req, res) => {
    console.log("Funcionando. Oi");
    res.status(200).json({
        mensagem: "Backend funcionando."
    });
})

export default app;