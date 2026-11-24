import { Router } from "express";

import { autenticar } from "../middlewares/authMiddleware.js";

import {
    listarGraficosModelo,
    criarGraficoModelo,
    buscarGraficoModelo,
    excluirGraficoModelo
} from "../controllers/graficoModelo.controller.js";

const router = Router();

// Todas as operações exigem autenticação.
router.use(autenticar);

// Listar gráficos modelo do usuário.
router.get("/", listarGraficosModelo);

// Criar um novo gráfico modelo.
router.post("/", criarGraficoModelo);

// Buscar um gráfico modelo específico.
router.get("/:id", buscarGraficoModelo);

// Excluir um gráfico modelo.
router.delete("/:id", excluirGraficoModelo);

export default router;