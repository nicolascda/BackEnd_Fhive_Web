import { Router } from "express";
import { criarEquipe, listarEquipes, excluirEquipe } from "../controllers/equipe.controller.js";
import { autenticar } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(autenticar);

router.post("/", criarEquipe);
router.get("/", listarEquipes);
router.delete("/:id", excluirEquipe);

export default router;
