import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

app.use(express.json()); // Obrigatório para ler o req.body
app.use(cors());

import app from "./src/app.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na http://localhost:${PORT}`);
});