import { randomInt } from "node:crypto";

const EXPIRACAO = 10 * 60 * 1000;
const EXPIRACAO_RECUPERACAO = 60 * 60 * 1000;
const MAX_TENTATIVAS_RECUPERACAO = 5;

const cadastrosPendentes = new Map();

const recuperacoesPendentes = new Map();

const gerarCodigo = () => {
    return randomInt(100000, 1000000).toString();
};

export const criarCadastroPendente = (
    email,
    dados
) => {
    const codigo = gerarCodigo();

    cadastrosPendentes.set(email, {
        ...dados,
        codigo,
        expiraEm: Date.now() + EXPIRACAO
    });

    setTimeout(() => {
        const cadastro = cadastrosPendentes.get(email);

        if (
            cadastro &&
            cadastro.codigo === codigo
        ) {
            cadastrosPendentes.delete(email);
        }
    }, EXPIRACAO);

    return codigo;
};

export const buscarCadastroPendente = (email) => {
    const cadastro = cadastrosPendentes.get(email);

    if (!cadastro) {
        return null;
    }

    if (Date.now() > cadastro.expiraEm) {
        cadastrosPendentes.delete(email);
        return null;
    }

    return cadastro;
};

export const removerCadastroPendente = (email) => {
    cadastrosPendentes.delete(email);
};

export const criarRecuperacaoPendente = (email, usuarioId) => {
    const codigo = gerarCodigo();

    const recuperacao = {
        usuarioId,
        codigo,
        expiraEm: Date.now() + EXPIRACAO_RECUPERACAO,
        tentativas: 0
    };

    recuperacoesPendentes.set(email, recuperacao);

    setTimeout(() => {
        if (recuperacoesPendentes.get(email) === recuperacao) {
            recuperacoesPendentes.delete(email);
        }
    }, EXPIRACAO_RECUPERACAO).unref?.();

    return codigo;
};

export const buscarRecuperacaoPendente = (email) => {
    const recuperacao = recuperacoesPendentes.get(email);

    if (!recuperacao) return null;

    if (Date.now() > recuperacao.expiraEm) {
        recuperacoesPendentes.delete(email);
        return null;
    }

    return recuperacao;
};

export const registrarTentativaRecuperacao = (email) => {
    const recuperacao = recuperacoesPendentes.get(email);

    if (!recuperacao) return true;

    recuperacao.tentativas += 1;

    if (recuperacao.tentativas >= MAX_TENTATIVAS_RECUPERACAO) {
        recuperacoesPendentes.delete(email);
        return true;
    }

    return false;
};

export const removerRecuperacaoPendente = (email) => {
    recuperacoesPendentes.delete(email);
};