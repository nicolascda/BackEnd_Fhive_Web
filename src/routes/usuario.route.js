import { Router } from "express";
import { criarUsuario, listarUsuarios, loginUsuario } from "../controllers/usuario.controller.js";
import { autenticar } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", autenticar, listarUsuarios);
router.post("/", criarUsuario);
router.post("/login", loginUsuario);

export default router;
