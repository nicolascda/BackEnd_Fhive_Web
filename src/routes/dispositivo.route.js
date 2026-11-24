import { Router } from "express";

import {
  criarDispositivo,
  listarDispositivos,
  buscarDispositivo,
  listarTelemetrias,
  buscarControleDispositivo,
  vincularControleDispositivo,
  desvincularControleDispositivo
} from "../controllers/dispositivo.controller.js";

import { autenticar } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(autenticar);

router.post("/", criarDispositivo);
router.get("/", listarDispositivos);
router.get("/:id", buscarDispositivo);
router.get("/:id/telemetrias", listarTelemetrias);

router.get("/:id/controle", buscarControleDispositivo);
router.put("/:id/controle", vincularControleDispositivo);
router.delete("/:id/controle", desvincularControleDispositivo);

export default router;