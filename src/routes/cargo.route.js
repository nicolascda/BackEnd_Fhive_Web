import { Router } from "express";
import { listarCargos, criarCargo, excluirCargo } from "../controllers/cargo.controller.js";
import { autenticar } from "../middlewares/authMiddleware.js";

const router = Router();
router.use(autenticar);

router.get("/:id/cargos", listarCargos);
router.post("/:id/cargos", criarCargo);
router.delete("/:id/cargos/:cargoId", excluirCargo);

export default router;