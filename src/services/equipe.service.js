import prisma from "../data/prisma.js";

// Limite efetivo definido para os planos atualmente disponíveis.
export const LIMITES_POR_PLANO = {
    "Básico": 30
};

// Permissões usadas pelos cargos da equipe.
export const PERMISSOES_EQUIPE = {
    visualizarAmbiente: "Visualizar o ambiente virtual",
    visualizarDados: "Consultar dados e indicadores",
    gerenciarMaquinas: "Adicionar, remover e reposicionar máquinas",
    gerenciarRotinas: "Criar, editar e remover rotinas",
    executarAcoes: "Aplicar rotinas e executar ações nos equipamentos",
    gerenciarIntegrantes: "Adicionar e remover integrantes",
    gerenciarCargos: "Criar e excluir cargos",
    configurarEquipe: "Alterar as configurações da equipe"
};

export function normalizarPermissoes(valores = {}) {
    const fonte = valores && typeof valores === "object" ? valores : {};
    const permissoes = Object.fromEntries(
        Object.keys(PERMISSOES_EQUIPE).map((chave) => [chave, fonte[chave] === true])
    );

    if (permissoes.gerenciarMaquinas || permissoes.gerenciarRotinas || permissoes.executarAcoes) {
        permissoes.visualizarAmbiente = true;
    }

    return permissoes;
}

export const CARGOS_PADRAO = [
    {
        nome: "Líder",
        descricao: "Responsável pela equipe e por todas as configurações.",
        cor: "#C85C0A",
        sistema: true,
        permissoes: normalizarPermissoes(Object.fromEntries(Object.keys(PERMISSOES_EQUIPE).map((chave) => [chave, true])))
    },
    {
        nome: "Administrador",
        descricao: "Administra máquinas, rotinas e integrantes da equipe.",
        cor: "#3975A8",
        sistema: true,
        permissoes: normalizarPermissoes({
            visualizarAmbiente: true,
            visualizarDados: true,
            gerenciarMaquinas: true,
            gerenciarRotinas: true,
            executarAcoes: true,
            gerenciarIntegrantes: true,
            gerenciarCargos: true
        })
    },
    {
        nome: "Operador",
        descricao: "Opera equipamentos e executa ações autorizadas.",
        cor: "#3F875B",
        sistema: true,
        permissoes: normalizarPermissoes({ visualizarAmbiente: true, visualizarDados: true, executarAcoes: true })
    },
    {
        nome: "Visualizador",
        descricao: "Consulta o ambiente e os indicadores sem modificá-los.",
        cor: "#8060A8",
        sistema: true,
        permissoes: normalizarPermissoes({ visualizarAmbiente: true, visualizarDados: true })
    }
];

export const erro = (res, status, mensagem) => res.status(status).json({ mensagem });
export const idValido = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
export const contarIntegrantes = (equipeId) => prisma.equipeIntegrantes.count({ where: { equipeId } });
export const obterLimiteDoPlano = (plano) => LIMITES_POR_PLANO[plano] ?? null;

// Cria os cargos padrão ausentes e garante o vínculo do proprietário como Líder.
export async function garantirCargosPadrao(equipeId, usuarioId, db = prisma) {
    const cargos = {};

    for (const definicao of CARGOS_PADRAO) {
        let cargo = await db.cargosEquipe.findFirst({ where: { equipeId, nome: definicao.nome } });
        if (!cargo) cargo = await db.cargosEquipe.create({ data: { equipeId, ...definicao } });
        cargos[cargo.nome] = cargo;
    }

    if (usuarioId) {
        const lider = await db.equipeIntegrantes.findUnique({
            where: { equipeId_usuarioId: { equipeId, usuarioId } }
        });

        if (!lider) {
            await db.equipeIntegrantes.create({ data: { equipeId, usuarioId, cargoId: cargos.Líder.id } });
        } else if (lider.cargoId !== cargos.Líder.id) {
            await db.equipeIntegrantes.update({ where: { id: lider.id }, data: { cargoId: cargos.Líder.id } });
        }
    }

    return cargos;
}

// Confirma acesso à equipe e carrega as permissões do usuário atual.
export async function obterContextoEquipe(equipeId, usuarioId) {
    if (!idValido(equipeId)) return { status: 400, mensagem: "ID de equipe inválido." };

    const equipe = await prisma.equipes.findUnique({ where: { id: equipeId } });
    if (!equipe) return { status: 404, mensagem: "Equipe não encontrada." };

    const souDono = equipe.usuarioId === usuarioId;
    let participacao = await prisma.equipeIntegrantes.findUnique({
        where: { equipeId_usuarioId: { equipeId, usuarioId } },
        include: { cargo: true }
    });

    if (!souDono && !participacao) return { status: 403, mensagem: "Você não faz parte desta equipe." };

    await garantirCargosPadrao(equipe.id, equipe.usuarioId);
    participacao = await prisma.equipeIntegrantes.findUnique({
        where: { equipeId_usuarioId: { equipeId, usuarioId } },
        include: { cargo: true }
    });

    const todasPermissoes = Object.fromEntries(Object.keys(PERMISSOES_EQUIPE).map((chave) => [chave, true]));
    const permissoes = normalizarPermissoes(souDono ? todasPermissoes : participacao?.cargo?.permissoes);

    return { equipe, souDono, participacao, permissoes };
}

export const pode = (contexto, permissao) => contexto.souDono || contexto.permissoes[permissao] === true;

export function cargoExcedePermissoesDoAtor(cargo, permissoesAtor) {
    return Object.entries(normalizarPermissoes(cargo?.permissoes))
        .some(([chave, ativo]) => ativo && permissoesAtor[chave] !== true);
}

export async function montarResumoEquipe(equipe, usuarioId) {
    await garantirCargosPadrao(equipe.id, equipe.usuarioId);

    const [quantidadeIntegrantes, participacao] = await Promise.all([
        contarIntegrantes(equipe.id),
        prisma.equipeIntegrantes.findUnique({
            where: { equipeId_usuarioId: { equipeId: equipe.id, usuarioId } },
            include: { cargo: true }
        })
    ]);

    const souDono = equipe.usuarioId === usuarioId;
    const limitePlano = obterLimiteDoPlano(equipe.plano) ?? equipe.limiteIntegrantes;
    const todasPermissoes = Object.fromEntries(Object.keys(PERMISSOES_EQUIPE).map((chave) => [chave, true]));

    return {
        ...equipe,
        limiteIntegrantes: Math.min(equipe.limiteIntegrantes, limitePlano),
        quantidadeIntegrantes,
        limitePlano,
        souDono,
        meuCargo: souDono ? "Líder" : (participacao?.cargo?.nome ?? "Integrante"),
        minhasPermissoes: normalizarPermissoes(souDono ? todasPermissoes : participacao?.cargo?.permissoes)
    };
}