import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { once } from "node:events";

const USUARIO_ID = "665f1a2b3c4d5e6f78901234";
const EQUIPE_ID = "665f1a2b3c4d5e6f78901235";
const DISPOSITIVO_ID = "665f1a2b3c4d5e6f78901236";
const INTEGRANTE_ID = "665f1a2b3c4d5e6f78901237";
const CARGO_ID = "665f1a2b3c4d5e6f78901238";

const metodosPorModelo = {
    usuarios: ["findUnique", "findFirst", "findMany", "create", "update"],
    dispositivos: ["findUnique", "findFirst", "findMany", "create", "update"],
    telemetrias: ["findUnique", "findFirst", "findMany", "create", "update", "delete"],
    rotinas: ["findUnique", "findFirst", "findMany", "create", "update", "delete"],
    equipes: ["findUnique", "findFirst", "findMany", "create", "update", "delete", "deleteMany"],
    equipeIntegrantes: ["findUnique", "findFirst", "findMany", "create", "update", "delete", "deleteMany", "count"],
    cargosEquipe: ["findUnique", "findFirst", "findMany", "create", "update", "delete", "deleteMany", "count"]
};

const fakePrisma = {};

function resetPrisma() {
    for (const [modelo, metodos] of Object.entries(metodosPorModelo)) {
        fakePrisma[modelo] ??= {};
        for (const metodo of metodos) {
            fakePrisma[modelo][metodo] = async () => {
                if (metodo === "findMany") return [];
                if (metodo === "count") return 0;
                if (metodo.startsWith("delete")) return { count: 1 };
                if (metodo === "create" || metodo === "update") return {};
                return null;
            };
        }
    }
    fakePrisma.$transaction = async (operacoes) => {
        if (Array.isArray(operacoes)) return Promise.all(operacoes);
        return operacoes(fakePrisma);
    };
}

let contextoEquipeAtual;
let cadastroPendenteAtual;
let recuperacaoPendenteAtual;

const permissoesTodas = {
    visualizarAmbiente: true,
    visualizarDados: true,
    gerenciarMaquinas: true,
    gerenciarRotinas: true,
    executarAcoes: true,
    gerenciarIntegrantes: true,
    gerenciarCargos: true,
    configurarEquipe: true
};

function contextoDono() {
    return {
        equipe: {
            id: EQUIPE_ID,
            usuarioId: USUARIO_ID,
            nome: "Equipe de teste",
            codigo: "A1B2C3D4",
            plano: "Básico",
            limiteIntegrantes: 30
        },
        participacao: { cargo: { nome: "Líder" } },
        souDono: true,
        permissoes: { ...permissoesTodas }
    };
}

const equipeServiceMock = {
    erro: (res, status, mensagem) => res.status(status).json({ mensagem }),
    idValido: (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id),
    contarIntegrantes: async (equipeId) => fakePrisma.equipeIntegrantes.count({ where: { equipeId } }),
    garantirCargosPadrao: async () => ({}),
    obterContextoEquipe: async () => contextoEquipeAtual,
    pode: (contexto, permissao) => Boolean(contexto?.souDono || contexto?.permissoes?.[permissao]),
    cargoExcedePermissoesDoAtor: () => false,
    obterLimiteDoPlano: (plano) => (plano === "Básico" ? 30 : plano === "Profissional" ? 100 : null),
    montarResumoEquipe: async (equipe) => ({ ...equipe, quantidadeIntegrantes: 1, souDono: true, meuCargo: "Líder" }),
    normalizarPermissoes: (permissoes = {}) => Object.fromEntries(
        Object.keys(permissoesTodas).map((chave) => [chave, permissoes[chave] === true])
    ),
    CARGOS_PADRAO: [{ nome: "Líder" }, { nome: "Administrador" }, { nome: "Integrante" }],
    PERMISSOES_EQUIPE: { ...permissoesTodas }
};

const codigoServiceMock = {
    criarCadastroPendente: () => "123456",
    buscarCadastroPendente: () => cadastroPendenteAtual,
    removerCadastroPendente: () => { cadastroPendenteAtual = null; },
    criarRecuperacaoPendente: () => "654321",
    buscarRecuperacaoPendente: () => recuperacaoPendenteAtual,
    registrarTentativaRecuperacao: () => false,
    removerRecuperacaoPendente: () => { recuperacaoPendenteAtual = null; }
};

const emailServiceMock = {
    enviarCodigoConfirmacao: async () => undefined,
    enviarCodigoRecuperacaoSenha: async () => undefined
};

const bcryptMock = {
    hash: async (senha) => `hash:${senha}`,
    compare: async () => true
};

const jwtMock = {
    sign: () => "jwt-de-teste",
    verify: () => ({ id: USUARIO_ID, email: "teste@fhive.com" })
};

const geminiServiceMock = {
    gerarRespostaGemini: async () => "Resposta simulada do assistente.",
    interpretarJsonGemini: (texto) => JSON.parse(texto),
    obterModeloConfigurado: () => "gemini-teste"
};

resetPrisma();
mock.module("../src/data/prisma.js", { defaultExport: fakePrisma });
mock.module("../src/services/equipe.service.js", { namedExports: equipeServiceMock });
mock.module("../src/services/codigo.service.js", { namedExports: codigoServiceMock });
mock.module("../src/services/email.service.js", { namedExports: emailServiceMock });
mock.module("../src/services/gemini.service.js", { namedExports: geminiServiceMock });
mock.module("bcrypt", { defaultExport: bcryptMock });
mock.module("jsonwebtoken", { defaultExport: jwtMock });

// Os controllers só são importados depois que suas dependências são substituídas pelos mocks.
const usuarios = await import("../src/controllers/usuario.controller.js");
const configurador = await import("../src/controllers/configurador.controller.js");
const dispositivos = await import("../src/controllers/dispositivo.controller.js");
const equipes = await import("../src/controllers/equipe.controller.js");
const integrantes = await import("../src/controllers/equipeIntegrante.controller.js");
const cargos = await import("../src/controllers/cargo.controller.js");
const rotinas = await import("../src/controllers/rotina.controller.js");
const ia = await import("../src/controllers/ia.controller.js");
const graficosModelo = await import("../src/controllers/graficoModelo.controller.js");

function req({ body = {}, params = {}, usuario = { id: USUARIO_ID } } = {}) {
    return { body, params, usuario, headers: {} };
}

function res() {
    return {
        statusCode: 200,
        body: undefined,
        headers: {},
        status(codigo) { this.statusCode = codigo; return this; },
        json(dados) { this.body = dados; return this; },
        set(nome, valor) { this.headers[nome] = valor; return this; }
    };
}

async function executar(handler, requisicao = req()) {
    const resposta = res();
    await handler(requisicao, resposta);
    return resposta;
}

beforeEach(() => {
    resetPrisma();
    contextoEquipeAtual = contextoDono();
    cadastroPendenteAtual = null;
    recuperacaoPendenteAtual = null;
    bcryptMock.hash = async (senha) => `hash:${senha}`;
    bcryptMock.compare = async () => true;
    jwtMock.sign = () => "jwt-de-teste";
    geminiServiceMock.gerarRespostaGemini = async () => "Resposta simulada do assistente.";
    geminiServiceMock.obterModeloConfigurado = () => "gemini-teste";
});

// USUÁRIOS

test("usuario.controller: lista usuários com sucesso", async () => {
    const lista = [{ id: USUARIO_ID, nome: "Ana", email: "ana@fhive.com", createdAt: new Date("2026-01-01") }];
    fakePrisma.usuarios.findMany = async () => lista;

    const resposta = await executar(usuarios.listarUsuarios);

    assert.equal(resposta.statusCode, 200);
    assert.deepEqual(resposta.body, lista);
});

test("usuario.controller: retorna erro 500 quando a consulta falha", async () => {
    fakePrisma.usuarios.findMany = async () => { throw new Error("Banco indisponível"); };

    const resposta = await executar(usuarios.listarUsuarios);

    assert.equal(resposta.statusCode, 500);
    assert.equal(resposta.body.erro, "Banco indisponível");
});

test("usuario.controller: realiza login e retorna JWT", async () => {
    fakePrisma.usuarios.findFirst = async () => ({ id: USUARIO_ID, nome: "Ana", email: "ana@fhive.com", senha: "hash", fotoPerfil: null });

    const resposta = await executar(usuarios.loginUsuario, req({ body: { email: "ANA@FHIVE.COM", senha: "Senha123" } }));

    assert.equal(resposta.statusCode, 200);
    assert.equal(resposta.body.token, "jwt-de-teste");
    assert.equal(resposta.body.usuario.email, "ana@fhive.com");
});

// CONFIGURADOR / RECUPERAÇÃO DE SENHA

test("configurador.controller: rejeita solicitação sem e-mail", async () => {
    const resposta = await executar(configurador.solicitarRecuperacaoSenha, req({ body: {} }));

    assert.equal(resposta.statusCode, 400);
    assert.equal(resposta.body.mensagem, "Informe um e-mail válido.");
});

test("configurador.controller: responde com sucesso sem revelar se o e-mail existe", async () => {
    fakePrisma.usuarios.findUnique = async () => null;

    const resposta = await executar(configurador.solicitarRecuperacaoSenha, req({ body: { email: "nao-existe@fhive.com" } }));

    assert.equal(resposta.statusCode, 200);
    assert.match(resposta.body.mensagem, /Se o e-mail estiver cadastrado/);
});

test("configurador.controller: redefine senha com código válido", async () => {
    recuperacaoPendenteAtual = { codigo: "654321", usuarioId: USUARIO_ID };
    let atualizacao;
    fakePrisma.usuarios.update = async (args) => { atualizacao = args; return {}; };

    const resposta = await executar(configurador.redefinirSenha, req({
        body: { email: "ana@fhive.com", codigo: "654321", novaSenha: "NovaSenha123" }
    }));

    assert.equal(resposta.statusCode, 200);
    assert.equal(resposta.body.mensagem, "Senha redefinida com sucesso.");
    assert.equal(atualizacao.data.senha, "hash:NovaSenha123");
});

// DISPOSITIVOS E CONTROLE SAMSUNG

test("dispositivo.controller: lista dispositivos do usuário", async () => {
    const lista = [{ id: DISPOSITIVO_ID, nome: "TV sala", tipo: "TV" }];
    fakePrisma.dispositivos.findMany = async () => lista;

    const resposta = await executar(dispositivos.listarDispositivos);

    assert.equal(resposta.statusCode, 200);
    assert.deepEqual(resposta.body, lista);
});

test("dispositivo.controller: retorna 404 para dispositivo inexistente", async () => {
    fakePrisma.dispositivos.findFirst = async () => null;

    const resposta = await executar(dispositivos.buscarDispositivo, req({ params: { id: DISPOSITIVO_ID } }));

    assert.equal(resposta.statusCode, 404);
    assert.equal(resposta.body.mensagem, "Dispositivo não encontrado.");
});

test("dispositivo.controller: salva vínculo da TV Samsung com IP privado", async () => {
    fakePrisma.dispositivos.findFirst = async () => ({ id: DISPOSITIVO_ID, tipo: "TV" });
    fakePrisma.dispositivos.update = async ({ data }) => ({
        controleProvedor: data.controleProvedor,
        controleIp: data.controleIp,
        controleNome: data.controleNome,
        controleModelo: data.controleModelo,
        controlePareadoEm: data.controlePareadoEm
    });

    const resposta = await executar(dispositivos.vincularControleDispositivo, req({
        params: { id: DISPOSITIVO_ID },
        body: { provedor: "samsung_ip_control", ip: "192.168.15.168", nome: "Samsung", modelo: "UN55" }
    }));

    assert.equal(resposta.statusCode, 200);
    assert.equal(resposta.body.controle.ip, "192.168.15.168");
    assert.equal(resposta.body.controle.provedor, "samsung_ip_control");
});

test("dispositivo.controller: rejeita IP público no vínculo Samsung", async () => {
    fakePrisma.dispositivos.findFirst = async () => ({ id: DISPOSITIVO_ID, tipo: "TV" });
    let atualizou = false;
    fakePrisma.dispositivos.update = async () => { atualizou = true; return {}; };

    const resposta = await executar(dispositivos.vincularControleDispositivo, req({
        params: { id: DISPOSITIVO_ID },
        body: { provedor: "samsung_ip_control", ip: "8.8.8.8" }
    }));

    assert.equal(resposta.statusCode, 400);
    assert.equal(atualizou, false);
});

// EQUIPES

test("equipe.controller: lista equipes sem erro", async () => {
    fakePrisma.equipes.findMany = async () => [];
    fakePrisma.equipeIntegrantes.findMany = async () => [];

    const resposta = await executar(equipes.listarEquipes);

    assert.equal(resposta.statusCode, 200);
    assert.deepEqual(resposta.body, []);
});

test("equipe.controller: cria equipe e retorna 201", async () => {
    fakePrisma.equipes.findUnique = async () => null;
    fakePrisma.equipes.create = async ({ data }) => ({ id: EQUIPE_ID, ...data });

    const resposta = await executar(equipes.criarEquipe, req({
        body: { nome: "Equipe de teste", setor: "Industrial", plano: "Básico", limiteIntegrantes: 10 }
    }));

    assert.equal(resposta.statusCode, 201);
    assert.equal(resposta.body.equipe.nome, "Equipe de teste");
    assert.equal(resposta.body.equipe.meuCargo, "Líder");
});

test("equipe.controller: rejeita setor não reconhecido", async () => {
    const resposta = await executar(equipes.criarEquipe, req({
        body: { nome: "Equipe de teste", setor: "Comercial", limiteIntegrantes: 10 }
    }));

    assert.equal(resposta.statusCode, 400);
    assert.equal(resposta.body.mensagem, "Selecione um setor válido.");
});

// INTEGRANTES

test("equipeIntegrante.controller: lista integrantes de uma equipe", async () => {
    fakePrisma.equipeIntegrantes.findMany = async () => [{
        id: INTEGRANTE_ID,
        usuarioId: USUARIO_ID,
        createdAt: new Date("2026-01-01"),
        usuario: { id: USUARIO_ID, nome: "Ana", email: "ana@fhive.com", fotoPerfil: null },
        cargo: { id: CARGO_ID, nome: "Líder" }
    }];

    const resposta = await executar(integrantes.listarIntegrantes, req({ params: { id: EQUIPE_ID } }));

    assert.equal(resposta.statusCode, 200);
    assert.equal(resposta.body.quantidadeIntegrantes, 1);
    assert.equal(resposta.body.integrantes[0].nome, "Ana");
});

test("equipeIntegrante.controller: bloqueia cargo sem permissão para listar integrantes", async () => {
    contextoEquipeAtual = {
        ...contextoDono(),
        souDono: false,
        permissoes: Object.fromEntries(Object.keys(permissoesTodas).map((chave) => [chave, false]))
    };

    const resposta = await executar(integrantes.listarIntegrantes, req({ params: { id: EQUIPE_ID } }));

    assert.equal(resposta.statusCode, 403);
    assert.equal(resposta.body.mensagem, "Seu cargo não permite consultar os integrantes.");
});

// CARGOS

test("cargo.controller: lista cargos da equipe", async () => {
    fakePrisma.cargosEquipe.findMany = async () => [{ id: CARGO_ID, nome: "Líder", sistema: true }];

    const resposta = await executar(cargos.listarCargos, req({ params: { id: EQUIPE_ID } }));

    assert.equal(resposta.statusCode, 200);
    assert.equal(resposta.body.cargos.length, 1);
});

test("cargo.controller: cria cargo personalizado", async () => {
    fakePrisma.cargosEquipe.findMany = async () => [];
    fakePrisma.cargosEquipe.create = async ({ data }) => ({ id: CARGO_ID, ...data });

    const resposta = await executar(cargos.criarCargo, req({
        params: { id: EQUIPE_ID },
        body: { nome: "Supervisor", descricao: "Coordena a equipe", cor: "#3975A8", permissoes: { visualizarAmbiente: true } }
    }));

    assert.equal(resposta.statusCode, 201);
    assert.equal(resposta.body.cargo.nome, "Supervisor");
});

test("cargo.controller: rejeita cor fora do formato hexadecimal", async () => {
    const resposta = await executar(cargos.criarCargo, req({
        params: { id: EQUIPE_ID },
        body: { nome: "Supervisor", cor: "roxo" }
    }));

    assert.equal(resposta.statusCode, 400);
    assert.equal(resposta.body.mensagem, "Informe uma cor hexadecimal válida.");
});

// ROTINAS INDIVIDUAIS

test("rotina.controller: cria rotina individual válida", async () => {
    fakePrisma.rotinas.findFirst = async () => null;
    fakePrisma.dispositivos.findFirst = async () => ({ id: DISPOSITIVO_ID, deviceId: "fhive-tv-01" });
    fakePrisma.rotinas.create = async ({ data }) => ({ id: "665f1a2b3c4d5e6f78901239", ...data });

    const resposta = await executar(rotinas.criarRotina, req({ body: {
        nome: "Abertura",
        horarioInicial: "08:00",
        horarioFinal: "09:00",
        diasSemana: { segunda: true, terca: false, quarta: false, quinta: false, sexta: false, sabado: false, domingo: false },
        acoes: [{ ordem: 1, horario: "08:15", tipo: "ligar", instrucoes: {} }],
        dispositivoId: "fhive-tv-01"
    } }));

    assert.equal(resposta.statusCode, 201);
    assert.equal(resposta.body.rotina.nome, "Abertura");
});

test("rotina.controller: rejeita criação sem campos obrigatórios", async () => {
    const resposta = await executar(rotinas.criarRotina, req({ body: { nome: "" } }));

    assert.equal(resposta.statusCode, 400);
    assert.match(resposta.body.mensagem, /obrigatórios/);
});

// INTELIGÊNCIA ARTIFICIAL

test("ia.controller: retorna resposta do assistente", async () => {
    geminiServiceMock.gerarRespostaGemini = async () => "Resposta simulada do assistente.";

    const resposta = await executar(ia.perguntarAssistente, req({
        usuario: { id: "user-ia-success" },
        body: { pergunta: "Como reduzir o consumo da TV?" }
    }));

    assert.equal(resposta.statusCode, 200);
    assert.equal(resposta.body.resposta, "Resposta simulada do assistente.");
    assert.equal(resposta.body.modelo, "gemini-teste");
});

test("ia.controller: rejeita pergunta vazia", async () => {
    const resposta = await executar(ia.perguntarAssistente, req({
        usuario: { id: "user-ia-empty" },
        body: { pergunta: "   " }
    }));

    assert.equal(resposta.statusCode, 400);
    assert.equal(resposta.body.mensagem, "Informe uma pergunta para o assistente.");
});

// GRÁFICOS MODELO

test("graficoModelo.controller: retorna lista vazia quando o usuário não possui dispositivos", async () => {
    fakePrisma.dispositivos.findMany = async () => [];

    const resposta = await executar(graficosModelo.listarGraficosModelo);

    assert.equal(resposta.statusCode, 200);
    assert.deepEqual(resposta.body, []);
});

test("graficoModelo.controller: rejeita ID de dispositivo que não é ObjectId", async () => {
    const resposta = await executar(graficosModelo.criarGraficoModelo, req({
        body: { dispositivoId: "fhive-tv-01" }
    }));

    assert.equal(resposta.statusCode, 400);
    assert.equal(resposta.body.mensagem, "Informe um ID MongoDB válido para o aparelho.");
});


// ROTAS DE DOCUMENTAÇÃO (teste HTTP real sem acessar serviços externos)
const app = (await import("../src/app.js")).default;

test("Swagger: disponibiliza a especificação OpenAPI em /docs.json", async () => {
    const servidor = app.listen(0);
    await once(servidor, "listening");
    const { port } = servidor.address();
    try {
        const resposta = await fetch(`http://127.0.0.1:${port}/docs.json`);
        const documento = await resposta.json();
        assert.equal(resposta.status, 200);
        assert.equal(documento.openapi, "3.0.3");
        assert.ok(documento.paths["/usuarios"].get);
    } finally {
        await new Promise((resolve, reject) => servidor.close((erro) => erro ? reject(erro) : resolve()));
    }
});

test("Swagger: serve a interface em /docs", async () => {
    const servidor = app.listen(0);
    await once(servidor, "listening");
    const { port } = servidor.address();
    try {
        const resposta = await fetch(`http://127.0.0.1:${port}/docs`);
        const html = await resposta.text();
        assert.equal(resposta.status, 200);
        assert.match(html, /swagger-ui/);
        assert.match(html, /\/docs\.json/);
    } finally {
        await new Promise((resolve, reject) => servidor.close((erro) => erro ? reject(erro) : resolve()));
    }
});
