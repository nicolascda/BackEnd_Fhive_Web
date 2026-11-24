import { Router } from "express";

import { solicitarRecuperacaoSenha, verificarCodigoRecuperacao, redefinirSenha } from "../controllers/configurador.controller.js";

const router = Router();

router.post("/esqueci-senha", solicitarRecuperacaoSenha );
router.post("/verificar-codigo-recuperacao", verificarCodigoRecuperacao);

router.post("/redefinir-senha", redefinirSenha );

export default router;