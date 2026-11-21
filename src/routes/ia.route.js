import { Router } from "express";

import { autenticar } from "../middlewares/authMiddleware.js";

import {
    perguntarAssistente,
    estimarConsumo,
    analisarAnomaliasDispositivo
} from "../controllers/ia.controller.js";

const router = Router();

router.use(autenticar);

router.post("/perguntar", perguntarAssistente);
router.post("/estimar-consumo", estimarConsumo);
router.post( "/dispositivos/:id/analisar-anomalias", analisarAnomaliasDispositivo);

export default router;