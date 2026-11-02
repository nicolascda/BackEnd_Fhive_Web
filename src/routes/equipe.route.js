import { Router } from "express";
import {
    criarEquipe,
    listarEquipes,
    obterEquipe,
    atualizarEquipe,
    excluirEquipe
} from "../controllers/equipe.controller.js";
import { autenticar } from "../middlewares/authMiddleware.js";

const router = Router();
router.use(autenticar);

router.post("/", criarEquipe);
router.get("/", listarEquipes);
router.get("/:id", obterEquipe);
router.patch("/:id", atualizarEquipe);
router.delete("/:id", excluirEquipe);

export default router;