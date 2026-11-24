import express from "express";
import cors from "cors";

import usuarioRoutes from "./routes/usuario.route.js";
import dispositivoRoutes from "./routes/dispositivo.route.js";
import rotinaRoutes, { rotinaEquipeRouter } from "./routes/rotina.route.js";
import gerenciadorRoutes from "./routes/configurador.route.js";
import equipeRoutes from "./routes/equipe.route.js";
import equipeIntegranteRoutes from "./routes/equipeIntegrante.route.js";
import cargoRoutes from "./routes/cargo.route.js";
import iaRoutes from "./routes/ia.route.js";
import graficoModeloRoutes from "./routes/graficoModelo.route.js";
import openapi from "./docs/openapi.js";
import { swaggerUiHtml } from "./docs/swaggerUi.js";


const app = express();


app.use(express.json({ limit: "7mb" })); // Obrigatório para ler o req.body
app.use(cors());


app.use("/usuarios", usuarioRoutes);
app.use("/dispositivos", dispositivoRoutes);
app.use("/rotinas", rotinaRoutes);
app.use("/usuarios", gerenciadorRoutes);
app.use("/equipes", rotinaEquipeRouter);
app.use("/equipes", equipeRoutes);
app.use("/equipes", equipeIntegranteRoutes);
app.use("/equipes", cargoRoutes);
app.use("/ia", iaRoutes);
app.use("/graficos-modelo", graficoModeloRoutes);

// Documentação OpenAPI e interface Swagger UI.
app.get("/docs.json", (req, res) => {
    res.status(200).json(openapi);
});

app.get(["/docs", "/docs/"], (req, res) => {
    res.status(200).type("html").send(swaggerUiHtml);
});


app.get("/", (req, res) => {
    console.log("Funcionando. Oi");
    res.status(200).json({
        mensagem: "Backend funcionando."
    });
})

export default app;