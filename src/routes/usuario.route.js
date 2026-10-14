import { Router } from "express";
import { criarUsuario, listarUsuarios, loginUsuario, confirmarEmail, obterPerfil, atualizarPerfil } from "../controllers/usuario.controller.js";
import { autenticar } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", autenticar, listarUsuarios);
router.post("/", criarUsuario);
router.post("/confirmarEmail", confirmarEmail);
router.post("/login", loginUsuario);
router.get("/perfil", autenticar, obterPerfil);
router.patch("/perfil", autenticar, atualizarPerfil);

export default router;
