import { Router } from "express";
import { listarIntegrantes, entrarEquipePorCodigo, atualizarCargoIntegrante, removerIntegrante} from "../controllers/equipeIntegrante.controller.js";
import { autenticar } from "../middlewares/authMiddleware.js";

const router = Router();
router.use(autenticar);

router.post("/entrar", entrarEquipePorCodigo);
router.get("/:id/integrantes", listarIntegrantes);
router.patch("/:id/integrantes/:integranteId/cargo", atualizarCargoIntegrante);
router.delete("/:id/integrantes/:integranteId", removerIntegrante);

export default router;