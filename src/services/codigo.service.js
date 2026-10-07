import { randomInt } from "node:crypto";

const EXPIRACAO = 10 * 60 * 1000;

const cadastrosPendentes = new Map();

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