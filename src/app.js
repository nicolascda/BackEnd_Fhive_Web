import express from "express";
import cors from "cors";

import usuarioRoutes from "./routes/usuario.route.js";
import dispositivoRoutes from "./routes/dispositivo.route.js";

const app = express();


app.use(express.json()); // Obrigatório para ler o req.body
app.use(cors());


app.use("/usuarios", usuarioRoutes);
app.use("/dispositivos", dispositivoRoutes);


app.get("/", (req, res) => {
    console.log("Funcionando. Oi");
    res.status(200).json({
        mensagem: "Backend funcionando."
    });
})

export default app;