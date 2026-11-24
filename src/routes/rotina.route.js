import express from "express";
import {
    criarRotina, listarRotinas, buscarRotina, atualizarRotina, excluirRotina,
    listarRotinasEquipe, criarRotinaEquipe, atualizarRotinaEquipe, excluirRotinaEquipe
} from "../controllers/rotina.controller.js";
import { autenticar } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(autenticar);

router.post("/", criarRotina);
router.get("/", listarRotinas);
router.get("/:id", buscarRotina);
router.put("/:id", atualizarRotina);
router.delete("/:id", excluirRotina);

export default router;

export const rotinaEquipeRouter = express.Router();

rotinaEquipeRouter.use(autenticar);
rotinaEquipeRouter.get("/:equipeId/rotinas", listarRotinasEquipe);
rotinaEquipeRouter.post("/:equipeId/rotinas", criarRotinaEquipe);
rotinaEquipeRouter.put("/:equipeId/rotinas/:id", atualizarRotinaEquipe);
rotinaEquipeRouter.delete("/:equipeId/rotinas/:id", excluirRotinaEquipe);