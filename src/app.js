import express from "express";
import cors from "cors";

import usuarioRoutes from "./routes/usuario.route.js";

const app = express();


app.use(express.json()); // Obrigatório para ler o req.body
app.use(cors());


app.use("/usuarios", usuarioRoutes);

app.get("/", (req, res) => {
    console.log("Funcionando. Oi");
})

export default app