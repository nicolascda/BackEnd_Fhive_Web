import express from "express";
import { criarRotina, listarRotinas, buscarRotina, atualizarRotina, excluirRotina } 
from "../controllers/rotina.controller.js";
import { autenticar } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(autenticar);

router.post("/", criarRotina);
router.get("/", listarRotinas);
router.get("/:id", buscarRotina);
router.put("/:id", atualizarRotina);
router.delete("/:id", excluirRotina);

export default router;