/**
 * Especificação OpenAPI do FHIVE.
 * Cada operação declara somente os status que seu controller/middleware pode retornar.
 * Os exemplos de erro são específicos da operação; não existe um bloco genérico de erros
 * reutilizado indiscriminadamente entre GETs, POSTs e operações de perfil.
 */

const schemaFromExample = (value) => {
    if (value === null) return { type: "string", nullable: true };
    if (Array.isArray(value)) {
        return {
            type: "array",
            items: value.length ? schemaFromExample(value[0]) : { type: "object", additionalProperties: true }
        };
    }
    if (typeof value === "object") {
        return {
            type: "object",
            properties: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, schemaFromExample(item)])),
            additionalProperties: false
        };
    }
    if (typeof value === "boolean") return { type: "boolean" };
    if (typeof value === "number") return { type: Number.isInteger(value) ? "integer" : "number" };
    return { type: "string" };
};

const jsonResponse = (description, example) => ({
    description,
    content: {
        "application/json": {
            schema: schemaFromExample(example),
            example
        }
    }
});

const ok = (description, example) => jsonResponse(description, example);
const err = (description, mensagem, campo = "mensagem") =>
    jsonResponse(description, { [campo]: mensagem });
const errComDetalhe = (description, mensagem, detalhe) =>
    jsonResponse(description, { mensagem, erro: detalhe });

const unauthorized = err(
    "O middleware rejeitou a requisição por ausência ou invalidade do JWT.",
    "Token não informado."
);

const jsonBody = (schema, description = "Dados enviados no corpo da requisição em JSON.") => ({
    required: true,
    description,
    content: {
        "application/json": {
            schema: { $ref: `#/components/schemas/${schema}` }
        }
    }
});

const pathParameter = (name, description) => ({
    name,
    in: "path",
    required: true,
    description,
    schema: { type: "string" }
});

const operation = ({
    tag,
    summary,
    description,
    auth = true,
    body,
    params = [],
    responses
}) => {
    const declaredResponses = { ...responses };
    if (auth && !declaredResponses[401]) declaredResponses[401] = unauthorized;

    return {
        tags: [tag],
        summary,
        ...(description ? { description } : {}),
        security: auth ? [{ bearerAuth: [] }] : [],
        ...(params.length ? { parameters: params } : {}),
        ...(body ? { requestBody: jsonBody(body) } : {}),
        responses: declaredResponses
    };
};

const user = { id: "665f1a2b3c4d5e6f78901234", nome: "Maria Silva", email: "maria@exemplo.com", fotoPerfil: null };
const device = { id: "665f1a2b3c4d5e6f78901234", deviceId: "fhive-123456", nome: "TV da sala", tipo: "TV", status: "offline" };
const team = { id: "665f1a2b3c4d5e6f78901234", nome: "Equipe de Produção", setor: "Industrial", plano: "Básico", limiteIntegrantes: 10, codigo: "A1B2C3D4" };
const routine = { id: "665f1a2b3c4d5e6f78901234", nome: "Rotina de abertura", horarioInicial: "08:00", horarioFinal: "09:00", ativo: true };
const id = pathParameter("id", "ID MongoDB do recurso.");
const equipeId = pathParameter("equipeId", "ID MongoDB da equipe.");
const integranteId = pathParameter("integranteId", "ID MongoDB do vínculo do integrante com a equipe.");
const cargoId = pathParameter("cargoId", "ID MongoDB do cargo.");

const openapi = {
    openapi: "3.0.3",
    info: {
        title: "FHIVE — API REST",
        version: "1.0.0",
        description: [
            "Documentação dos endpoints registrados no backend FHIVE.",
            "As rotas são expostas diretamente, sem o prefixo `/api`.",
            "Endpoints protegidos exigem `Authorization: Bearer <token>`.",
            "Os códigos e exemplos de resposta foram separados por operação e conferidos com os controllers e o middleware de autenticação.",
            "O vínculo Samsung documentado armazena os dados da TV no backend; não abre a conexão WebSocket nem envia comandos à televisão."
        ].join("\n\n")
    },
    servers: [
        { url: "http://localhost:3000", description: "Servidor local" },
        { url: "/", description: "Mesmo host da API" }
    ],
    tags: [
        { name: "Saúde", description: "Verificação da disponibilidade da API." },
        { name: "Usuários", description: "Cadastro, autenticação, perfil e recuperação de senha." },
        { name: "Dispositivos", description: "Dispositivos, telemetrias e vínculo de controle local Samsung." },
        { name: "Rotinas", description: "Rotinas individuais e rotinas vinculadas a equipes." },
        { name: "Equipes", description: "Criação e gerenciamento de equipes." },
        { name: "Integrantes", description: "Entrada e administração de integrantes." },
        { name: "Cargos", description: "Cargos e permissões dentro das equipes." },
        { name: "IA", description: "Assistente, estimativa de consumo e análise de anomalias." },
        { name: "Gráficos modelo", description: "Geração e consulta de leituras artificiais na coleção Telemetrias." }
    ],
    paths: {
        "/": {
            get: operation({
                tag: "Saúde", summary: "Verificar se o backend está funcionando", auth: false,
                responses: { 200: ok("Servidor HTTP ativo.", { mensagem: "Backend funcionando." }) }
            })
        },
        "/usuarios": {
            post: operation({
                tag: "Usuários", summary: "Iniciar cadastro de usuário", auth: false, body: "CadastroUsuario",
                responses: {
                    200: ok("Código de confirmação enviado para o e-mail informado.", { mensagem: "Código de confirmação enviado para o e-mail." }),
                    400: err("Nome, e-mail ou senha não foram informados.", "Nome, e-mail e senha são obrigatórios."),
                    409: err("Já existe uma conta com o e-mail informado.", "Este e-mail já está cadastrado."),
                    500: errComDetalhe("Falha durante a preparação do cadastro ou envio do e-mail.", "Erro ao iniciar cadastro.", "Falha ao enviar e-mail de confirmação.")
                }
            }),
            get: operation({
                tag: "Usuários", summary: "Listar usuários", description: "Retorna a lista de usuários com identificador, nome, e-mail e data de criação. Não recebe imagem de perfil nesta operação.",
                responses: {
                    200: ok("Lista de usuários consultada.", [{ id: user.id, nome: user.nome, email: user.email, createdAt: "2026-11-23T10:00:00.000Z" }]),
                    500: err("Falha na consulta da lista de usuários.", "Falha na consulta de usuários.", "erro")
                }
            })
        },
        "/usuarios/confirmarEmail": {
            post: operation({
                tag: "Usuários", summary: "Confirmar e-mail e concluir cadastro", auth: false, body: "ConfirmarEmail",
                responses: {
                    201: ok("Cadastro confirmado e usuário criado.", { mensagem: "Cadastro confirmado com sucesso.", usuario: user }),
                    400: err("E-mail/código ausente, inexistente, expirado ou incorreto.", "Código de confirmação inválido."),
                    409: err("O e-mail já foi cadastrado por outra operação.", "Este e-mail já está cadastrado."),
                    500: errComDetalhe("Falha ao persistir o novo usuário.", "Erro ao confirmar e-mail.", "Falha ao criar usuário.")
                }
            })
        },
        "/usuarios/login": {
            post: operation({
                tag: "Usuários", summary: "Autenticar usuário e obter JWT", auth: false, body: "Login",
                responses: {
                    200: ok("Credenciais válidas; retorna JWT e dados básicos do usuário.", { mensagem: "Login realizado com sucesso!", token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", usuario: user }),
                    400: err("E-mail ou senha não foram informados.", "Nome ou e-mail e senha são obrigatórios."),
                    401: err("Usuário inexistente ou senha incorreta.", "Nome ou e-mail ou senha estão inválidos."),
                    500: err("Falha inesperada ao validar as credenciais.", "Erro ao realizar login.", "erro")
                }
            })
        },
        "/usuarios/perfil": {
            get: operation({
                tag: "Usuários", summary: "Consultar perfil do usuário autenticado",
                responses: {
                    200: ok("Perfil do usuário autenticado.", { usuario: { ...user, createdAt: "2026-11-23T10:00:00.000Z" } }),
                    404: err("Não existe usuário para o identificador do JWT.", "Usuário não encontrado."),
                    500: err("Falha ao consultar o perfil.", "Não foi possível carregar o perfil.")
                }
            }),
            patch: operation({
                tag: "Usuários", summary: "Atualizar nome, e-mail, foto de perfil ou senha", body: "AtualizarPerfil",
                responses: {
                    200: ok("Perfil atualizado.", { mensagem: "Perfil atualizado com sucesso.", usuario: user }),
                    400: err("Nome, e-mail, foto ou dados para troca de senha inválidos.", "Nome e e-mail são obrigatórios."),
                    404: err("Usuário autenticado não encontrado ao validar a senha atual.", "Usuário não encontrado."),
                    409: err("O e-mail informado pertence a outra conta.", "Este e-mail já está sendo usado por outra conta."),
                    413: err("A foto de perfil ultrapassou o limite de tamanho aceito pelo controller.", "A foto de perfil deve ter no máximo 2 MB."),
                    500: err("Falha ao atualizar os dados do perfil.", "Não foi possível atualizar o perfil.")
                }
            })
        },
        "/usuarios/esqueci-senha": {
            post: operation({
                tag: "Usuários", summary: "Solicitar código de recuperação de senha", auth: false, body: "SolicitarRecuperacao",
                responses: {
                    200: ok("Resposta neutra para não revelar se o e-mail existe; também enviada após tentar encaminhar o código.", { mensagem: "Se o e-mail estiver cadastrado, você receberá um código para redefinir sua senha. O código é válido por 1 hora." }),
                    400: err("O e-mail está ausente ou não é uma string válida.", "Informe um e-mail válido."),
                    500: err("Falha ao consultar ou iniciar a recuperação.", "Não foi possível processar a solicitação. Tente novamente.")
                }
            })
        },
        "/usuarios/verificar-codigo-recuperacao": {
            post: operation({
                tag: "Usuários", summary: "Validar código de recuperação", auth: false, body: "VerificarRecuperacao",
                responses: {
                    200: ok("Código de recuperação válido.", { mensagem: "Código de recuperação válido." }),
                    400: err("Dados ausentes, código inexistente, expirado ou incorreto.", "Código de recuperação inválido."),
                    500: err("Falha ao verificar o código.", "Não foi possível verificar o código. Tente novamente.")
                }
            })
        },
        "/usuarios/redefinir-senha": {
            post: operation({
                tag: "Usuários", summary: "Redefinir senha usando código válido", auth: false, body: "RedefinirSenha",
                responses: {
                    200: ok("Senha atualizada.", { mensagem: "Senha redefinida com sucesso." }),
                    400: err("Dados ausentes ou código inexistente, expirado ou incorreto.", "Código de recuperação inválido."),
                    500: err("Falha ao gravar a nova senha.", "Não foi possível redefinir a senha. Tente novamente.")
                }
            })
        },
        "/dispositivos": {
            post: operation({
                tag: "Dispositivos", summary: "Cadastrar dispositivo para o usuário autenticado", body: "CriarDispositivo",
                responses: {
                    201: ok("Dispositivo criado; o backend gera o deviceId utilizado na comunicação MQTT.", { mensagem: "Dispositivo criado com sucesso.", dispositivo: device }),
                    400: err("Nome ou tipo do dispositivo ausente.", "Nome e tipo do dispositivo são obrigatórios."),
                    500: err("Falha ao salvar o dispositivo.", "Erro ao criar dispositivo.", "erro")
                }
            }),
            get: operation({
                tag: "Dispositivos", summary: "Listar dispositivos do usuário autenticado",
                responses: {
                    200: ok("Lista de dispositivos pertencentes ao usuário autenticado.", [device]),
                    500: err("Falha na consulta dos dispositivos.", "Erro ao listar dispositivos.", "erro")
                }
            })
        },
        "/dispositivos/{id}": {
            get: operation({
                tag: "Dispositivos", summary: "Consultar um dispositivo do usuário autenticado", params: [id],
                responses: {
                    200: ok("Dispositivo encontrado.", device),
                    404: err("O dispositivo não existe ou não pertence ao usuário autenticado.", "Dispositivo não encontrado."),
                    500: err("Falha ao consultar o dispositivo.", "Erro ao buscar dispositivo.", "erro")
                }
            })
        },
        "/dispositivos/{id}/telemetrias": {
            get: operation({
                tag: "Dispositivos", summary: "Listar telemetrias reais de um dispositivo", description: "Inclui leituras MQTT e registros legados sem campo de origem. Sessões artificiais dos gráficos modelo são excluídas.", params: [id],
                responses: {
                    200: ok("Telemetrias reais consultadas.", [{ id: "665f1a2b3c4d5e6f78901234", minutoAtual: 1, consumo1Minuto: 0.08, consumoAcumulado: 0.08, origem: "mqtt" }]),
                    404: err("O dispositivo não existe ou não pertence ao usuário autenticado.", "Dispositivo não encontrado."),
                    500: err("Falha ao consultar as telemetrias.", "Erro ao listar telemetrias.", "erro")
                }
            })
        },
        "/dispositivos/{id}/controle": {
            get: operation({
                tag: "Dispositivos", summary: "Consultar vínculo de controle local do dispositivo", description: "Quando ainda não existe vínculo, o controller retorna `controle: null`.", params: [id],
                responses: {
                    200: ok("Vínculo consultado; o controller retorna `controle: null` quando ainda não há TV associada.", { controle: null }),
                    404: err("Dispositivo não encontrado para o usuário autenticado.", "Dispositivo não encontrado."),
                    500: err("Falha ao consultar o vínculo de controle.", "Não foi possível consultar a configuração de controle.")
                }
            }),
            put: operation({
                tag: "Dispositivos", summary: "Vincular TV Samsung ao dispositivo FHIVE", description: "Armazena o provedor `samsung_ip_control`, o IPv4 privado da TV e metadados opcionais. O dispositivo FHIVE precisa ser do tipo TV. Não abre WebSocket nem envia comandos.", params: [id], body: "VincularControleSamsung",
                responses: {
                    200: ok("Dados do vínculo Samsung salvos no dispositivo.", { mensagem: "Televisão vinculada ao aparelho FHIVE.", controle: { provedor: "samsung_ip_control", ip: "192.168.15.168", nome: "Samsung Crystal UHD", modelo: "UN55U8600FGXZD", pareadoEm: "2026-11-23T10:00:00.000Z" } }),
                    400: err("Dispositivo não é TV, provedor não suportado, IPv4 público/inválido ou metadados excedem 100 caracteres.", "Informe um endereço IPv4 privado válido da mesma rede local da televisão."),
                    404: err("Dispositivo não encontrado para o usuário autenticado.", "Dispositivo não encontrado."),
                    500: err("Falha ao persistir os dados do vínculo.", "Não foi possível salvar o vínculo da televisão.")
                }
            }),
            delete: operation({
                tag: "Dispositivos", summary: "Remover vínculo de controle local", params: [id],
                responses: {
                    200: ok("Dados de controle local removidos do dispositivo.", { mensagem: "Controle local desvinculado do aparelho." }),
                    404: err("Dispositivo não encontrado para o usuário autenticado.", "Dispositivo não encontrado."),
                    500: err("Falha ao remover os dados do vínculo.", "Não foi possível desvincular o controle da televisão.")
                }
            })
        },
        "/rotinas": {
            post: operation({
                tag: "Rotinas", summary: "Criar rotina individual", body: "CriarRotina",
                responses: {
                    201: ok("Rotina criada e associada ao dispositivo do usuário.", { mensagem: "Rotina criada com sucesso.", rotina: routine }),
                    400: err("Campos obrigatórios ou regras de horários, dias e ações inválidos.", "O horário inicial deve estar no formato HH:mm."),
                    404: err("Dispositivo indicado não encontrado na conta do usuário.", "Dispositivo não encontrado."),
                    409: err("Já existe uma rotina com o mesmo nome para o usuário.", "Já existe uma rotina com esse nome."),
                    500: errComDetalhe("Falha ao criar a rotina.", "Erro ao criar rotina.", "Falha ao gravar a rotina.")
                }
            }),
            get: operation({
                tag: "Rotinas", summary: "Listar rotinas individuais do usuário",
                responses: {
                    200: ok("Rotinas do usuário consultadas.", [routine]),
                    500: errComDetalhe("Falha ao consultar as rotinas.", "Erro ao listar rotinas.", "Falha ao consultar o banco de dados.")
                }
            })
        },
        "/rotinas/{id}": {
            get: operation({
                tag: "Rotinas", summary: "Consultar rotina individual", params: [id],
                responses: {
                    200: ok("Rotina encontrada.", routine),
                    404: err("Rotina inexistente ou não pertencente ao usuário.", "Rotina não encontrada."),
                    500: errComDetalhe("Falha ao consultar a rotina.", "Erro ao buscar rotina.", "Falha ao consultar o banco de dados.")
                }
            }),
            put: operation({
                tag: "Rotinas", summary: "Atualizar rotina individual", params: [id], body: "CriarRotina",
                responses: {
                    200: ok("Rotina atualizada.", { mensagem: "Rotina atualizada com sucesso.", rotina: routine }),
                    400: err("Campos ou regras de horário/dias/ações inválidos.", "O nome da rotina é inválido."),
                    404: err("Rotina ou dispositivo indicado não encontrado.", "Rotina não encontrada."),
                    409: err("Conflito com outra rotina de mesmo nome.", "Já existe uma rotina com esse nome."),
                    500: errComDetalhe("Falha ao atualizar a rotina.", "Erro ao atualizar rotina.", "Falha ao atualizar no banco de dados.")
                }
            }),
            delete: operation({
                tag: "Rotinas", summary: "Excluir rotina individual", params: [id],
                responses: {
                    200: ok("Rotina removida.", { mensagem: "Rotina excluída com sucesso." }),
                    404: err("Rotina inexistente ou não pertencente ao usuário.", "Rotina não encontrada."),
                    500: errComDetalhe("Falha ao excluir a rotina.", "Erro ao excluir rotina.", "Falha ao excluir no banco de dados.")
                }
            })
        },
        "/equipes": {
            post: operation({
                tag: "Equipes", summary: "Criar equipe", body: "CriarEquipe",
                responses: {
                    201: ok("Equipe criada; o proprietário é incluído como líder.", { mensagem: "Equipe criada com sucesso.", equipe: { ...team, quantidadeIntegrantes: 1, limitePlano: 30, souDono: true, meuCargo: "Líder" } }),
                    400: err("Nome, setor, plano ou limite de integrantes inválido.", "Selecione um setor válido."),
                    413: err("Imagem de fundo ou logo excede o tamanho aceito.", "Cada imagem deve ter no máximo 2 MB."),
                    500: err("Falha ao criar a equipe ou configurar os cargos padrão.", "Não foi possível criar a equipe.")
                }
            }),
            get: operation({
                tag: "Equipes", summary: "Listar equipes próprias e equipes das quais participa",
                responses: {
                    200: ok("Equipes do usuário consultadas.", [team]),
                    500: err("Falha ao montar a lista de equipes.", "Não foi possível carregar as equipes.")
                }
            })
        },
        "/equipes/{id}": {
            get: operation({
                tag: "Equipes", summary: "Consultar equipe", params: [id],
                responses: {
                    200: ok("Equipe e permissões do usuário consultadas.", { equipe: team, quantidadeIntegrantes: 4, limitePlano: 30, souDono: true, meuCargo: "Líder", minhasPermissoes: { visualizarAmbiente: true, gerenciarRotinas: true } }),
                    400: err("ID MongoDB da equipe inválido.", "ID de equipe inválido."),
                    403: err("Usuário não pertence à equipe.", "Você não faz parte desta equipe."),
                    404: err("Equipe inexistente.", "Equipe não encontrada."),
                    500: err("Falha ao consultar a equipe.", "Não foi possível carregar a equipe.")
                }
            }),
            patch: operation({
                tag: "Equipes", summary: "Atualizar configuração da equipe", params: [id], body: "AtualizarEquipe",
                responses: {
                    200: ok("Equipe atualizada.", { mensagem: "Equipe atualizada com sucesso.", equipe: team }),
                    400: err("ID, nome, setor, descrição ou limite inválido.", "O nome deve conter entre 1 e 80 caracteres."),
                    403: err("Cargo do usuário não permite configurar a equipe.", "Seu cargo não permite configurar esta equipe."),
                    404: err("Equipe não encontrada ou usuário sem participação.", "Equipe não encontrada."),
                    409: err("O limite não pode ser reduzido abaixo da quantidade atual de integrantes.", "A equipe possui integrantes acima do novo limite."),
                    413: err("Imagem de fundo ou logo excede o tamanho aceito.", "Cada imagem deve ter no máximo 2 MB."),
                    500: err("Falha ao atualizar a equipe.", "Não foi possível atualizar a equipe.")
                }
            }),
            delete: operation({
                tag: "Equipes", summary: "Excluir equipe do proprietário", params: [id],
                responses: {
                    200: ok("Equipe e vínculos de integrantes/cargos removidos.", { mensagem: "Equipe excluída com sucesso." }),
                    400: err("ID MongoDB da equipe inválido.", "ID de equipe inválido."),
                    404: err("Equipe não encontrada ou usuário não é o líder.", "Equipe não encontrada ou você não é o líder."),
                    500: err("Falha ao excluir a equipe.", "Não foi possível excluir a equipe.")
                }
            })
        },
        "/equipes/entrar": {
            post: operation({
                tag: "Integrantes", summary: "Entrar em equipe usando código de convite", body: "EntrarEquipe",
                responses: {
                    200: ok("Usuário adicionado à equipe.", { mensagem: "Você entrou na equipe Equipe de Produção.", equipe: team }),
                    400: err("Código de convite ausente ou inválido.", "Informe um código de equipe válido."),
                    404: err("Nenhuma equipe encontrada para o código informado.", "Nenhuma equipe foi encontrada com esse código."),
                    409: err("Usuário já participa da equipe ou limite de integrantes foi atingido.", "Você já faz parte desta equipe."),
                    500: err("Falha ao concluir a entrada na equipe.", "Não foi possível entrar na equipe.")
                }
            })
        },
        "/equipes/{id}/integrantes": {
            get: operation({
                tag: "Integrantes", summary: "Listar integrantes da equipe", params: [id],
                responses: {
                    200: ok("Integrantes e seus cargos foram consultados.", { integrantes: [{ id: "665f1a2b3c4d5e6f78901235", usuarioId: user.id, nome: user.nome, email: user.email, fotoPerfil: null, entrouEm: "2026-11-23T10:00:00.000Z", cargo: { id: "665f1a2b3c4d5e6f78901236", nome: "Líder" }, lider: true }], quantidadeIntegrantes: 1, limiteIntegrantes: 30, codigo: "A1B2C3D4", souDono: true, permissoes: { visualizarAmbiente: true } }),
                    400: err("ID MongoDB da equipe inválido.", "ID de equipe inválido."),
                    403: err("Usuário não pertence à equipe ou cargo não permite consultar integrantes.", "Seu cargo não permite consultar os integrantes."),
                    404: err("Equipe não encontrada.", "Equipe não encontrada."),
                    500: err("Falha ao consultar os integrantes.", "Não foi possível carregar os integrantes.")
                }
            })
        },
        "/equipes/{id}/integrantes/{integranteId}/cargo": {
            patch: operation({
                tag: "Integrantes", summary: "Alterar o cargo de um integrante", params: [id, integranteId], body: "AlterarCargoIntegrante",
                responses: {
                    200: ok("Cargo do integrante atualizado.", { mensagem: "Cargo do integrante atualizado.", integrante: { id: "665f1a2b3c4d5e6f78901235", usuarioId: user.id, nome: user.nome, email: user.email, fotoPerfil: null, cargo: { id: "665f1a2b3c4d5e6f78901236", nome: "Operador" }, lider: false } }),
                    400: err("ID de integrante/cargo inválido ou cargo Líder selecionado.", "ID de integrante ou cargo inválido."),
                    403: err("Permissão insuficiente ou tentativa de alterar o líder/administrador.", "Seu cargo não permite alterar cargos de integrantes."),
                    404: err("Integrante ou cargo não encontrado nesta equipe.", "Integrante ou cargo não encontrado nesta equipe."),
                    500: err("Falha ao atualizar o cargo.", "Não foi possível atualizar o cargo do integrante.")
                }
            })
        },
        "/equipes/{id}/integrantes/{integranteId}": {
            delete: operation({
                tag: "Integrantes", summary: "Remover integrante da equipe", params: [id, integranteId],
                responses: {
                    200: ok("Integrante removido da equipe.", { mensagem: "Integrante removido da equipe." }),
                    400: err("ID do integrante inválido.", "ID de integrante inválido."),
                    403: err("Permissão insuficiente ou tentativa de remover o líder/administrador.", "Seu cargo não permite remover integrantes."),
                    404: err("Integrante não encontrado na equipe.", "Integrante não encontrado."),
                    500: err("Falha ao remover o integrante.", "Não foi possível remover o integrante.")
                }
            })
        },
        "/equipes/{id}/cargos": {
            get: operation({
                tag: "Cargos", summary: "Listar cargos e permissões disponíveis na equipe", params: [id],
                responses: {
                    200: ok("Cargos e permissões da equipe consultados.", { cargos: [{ id: "665f1a2b3c4d5e6f78901236", nome: "Líder", descricao: "Proprietário da equipe", cor: "#8060A8", sistema: true }], permissoesDisponiveis: { visualizarAmbiente: "Visualizar ambiente" }, podeGerenciarCargos: true, podeGerenciarIntegrantes: true, permissoesAtuais: { gerenciarCargos: true } }),
                    400: err("ID MongoDB da equipe inválido.", "ID de equipe inválido."),
                    403: err("Usuário não pertence à equipe ou não possui permissão.", "Você não faz parte desta equipe."),
                    404: err("Equipe não encontrada.", "Equipe não encontrada."),
                    500: err("Falha ao carregar cargos da equipe.", "Não foi possível carregar os cargos.")
                }
            }),
            post: operation({
                tag: "Cargos", summary: "Criar cargo personalizado", params: [id], body: "CriarCargo",
                responses: {
                    201: ok("Cargo personalizado criado.", { mensagem: "Cargo criado com sucesso.", cargo: { id: "665f1a2b3c4d5e6f78901236", nome: "Supervisor", descricao: "Acompanha a equipe", cor: "#3975A8", sistema: false, permissoes: { visualizarAmbiente: true } } }),
                    400: err("Nome, descrição ou cor do cargo inválidos.", "Informe uma cor hexadecimal válida."),
                    403: err("Cargo atual não permite gerenciar cargos ou atribuir as permissões solicitadas.", "Seu cargo não permite criar cargos."),
                    404: err("Equipe não encontrada ou usuário sem participação.", "Equipe não encontrada."),
                    409: err("Nome reservado ou já utilizado por outro cargo da equipe.", "Já existe um cargo com esse nome nesta equipe."),
                    500: err("Falha ao criar o cargo.", "Não foi possível criar o cargo.")
                }
            })
        },
        "/equipes/{id}/cargos/{cargoId}": {
            delete: operation({
                tag: "Cargos", summary: "Excluir cargo personalizado", params: [id, cargoId],
                responses: {
                    200: ok("Cargo personalizado excluído.", { mensagem: "Cargo excluído com sucesso." }),
                    400: err("ID MongoDB do cargo inválido.", "ID de cargo inválido."),
                    403: err("Permissão insuficiente ou tentativa de excluir cargo padrão.", "Os cargos padrão não podem ser excluídos."),
                    404: err("Cargo não encontrado nesta equipe.", "Cargo não encontrado."),
                    409: err("Cargo ainda está atribuído a um ou mais integrantes.", "Esse cargo ainda está atribuído. Altere o cargo dos integrantes antes de excluí-lo."),
                    500: err("Falha ao excluir o cargo.", "Não foi possível excluir o cargo.")
                }
            })
        },
        "/equipes/{equipeId}/rotinas": {
            get: operation({
                tag: "Rotinas", summary: "Listar rotinas de uma equipe", params: [equipeId],
                responses: {
                    200: ok("Rotinas da equipe consultadas.", { rotinas: [routine] }),
                    400: err("ID MongoDB da equipe inválido.", "ID de equipe inválido."),
                    403: err("Usuário não tem permissão para visualizar as rotinas.", "Seu cargo não permite realizar esta operação nesta equipe."),
                    404: err("Equipe não encontrada ou usuário sem participação.", "Equipe não encontrada."),
                    500: err("Falha ao consultar rotinas da equipe.", "Não foi possível carregar as rotinas da equipe.")
                }
            }),
            post: operation({
                tag: "Rotinas", summary: "Criar rotina para uma equipe", params: [equipeId], body: "CriarRotinaEquipe",
                responses: {
                    201: ok("Rotina criada na equipe.", { mensagem: "Rotina salva no banco de dados.", rotina: routine }),
                    400: err("Dados de horário, dias ou ações inválidos.", "O horário inicial deve estar no formato HH:mm."),
                    403: err("Cargo atual não permite gerenciar rotinas nesta equipe.", "Seu cargo não permite realizar esta operação nesta equipe."),
                    404: err("Equipe não encontrada ou usuário sem participação.", "Equipe não encontrada."),
                    409: err("Já existe rotina com o mesmo nome na equipe.", "Já existe uma rotina com esse nome nesta equipe."),
                    500: err("Falha ao salvar rotina na equipe.", "Não foi possível salvar a rotina.")
                }
            })
        },
        "/equipes/{equipeId}/rotinas/{id}": {
            put: operation({
                tag: "Rotinas", summary: "Atualizar rotina de equipe", params: [equipeId, id], body: "CriarRotinaEquipe",
                responses: {
                    200: ok("Rotina da equipe atualizada.", { mensagem: "Rotina atualizada no banco de dados.", rotina: routine }),
                    400: err("ID ou dados da rotina inválidos.", "ID de rotina inválido."),
                    403: err("Cargo atual não permite gerenciar rotinas nesta equipe.", "Seu cargo não permite realizar esta operação nesta equipe."),
                    404: err("Equipe ou rotina não encontrada.", "Rotina não encontrada nesta equipe."),
                    409: err("Já existe outra rotina com o mesmo nome na equipe.", "Já existe outra rotina com esse nome nesta equipe."),
                    500: err("Falha ao atualizar a rotina da equipe.", "Não foi possível atualizar a rotina.")
                }
            }),
            delete: operation({
                tag: "Rotinas", summary: "Excluir rotina de equipe", params: [equipeId, id],
                responses: {
                    200: ok("Rotina removida da equipe.", { mensagem: "Rotina excluída do banco de dados." }),
                    400: err("ID de rotina inválido.", "ID de rotina inválido."),
                    403: err("Cargo atual não permite excluir rotinas nesta equipe.", "Seu cargo não permite realizar esta operação nesta equipe."),
                    404: err("Equipe ou rotina não encontrada.", "Rotina não encontrada nesta equipe."),
                    500: err("Falha ao excluir a rotina da equipe.", "Não foi possível excluir a rotina.")
                }
            })
        },
        "/ia/perguntar": {
            post: operation({
                tag: "IA", summary: "Enviar pergunta ao assistente FHIVE", description: "Até 1.800 caracteres por pergunta, histórico de até 8 mensagens e 12 requisições por usuário a cada minuto.", body: "PerguntarIA",
                responses: {
                    200: ok("Resposta gerada pelo assistente.", { resposta: "Uma TV pode consumir energia mesmo em standby.", modelo: "gemini-3.5-flash-lite" }),
                    400: err("Pergunta, aparelho ou histórico possui formato inválido.", "Informe uma pergunta para o assistente."),
                    429: err("Limite de chamadas à IA ou limite do provedor Gemini atingido.", "Você atingiu o limite temporário de solicitações à IA. Tente novamente em um minuto."),
                    502: err("O Gemini não conseguiu responder ou rejeitou a credencial/modelo.", "Não foi possível obter uma resposta do Gemini."),
                    503: err("Configuração ausente ou serviço Gemini temporariamente indisponível.", "O Gemini está temporariamente indisponível ou sobrecarregado. Tente novamente."),
                    504: err("A solicitação ao Gemini excedeu o tempo limite.", "O Gemini demorou demais para responder. Tente novamente.")
                }
            })
        },
        "/ia/estimar-consumo": {
            post: operation({
                tag: "IA", summary: "Estimar consumo elétrico de um aparelho", description: "Quando potência e horas de uso são fornecidas, o backend calcula o consumo sem chamar o Gemini. Quando faltam dados, solicita estimativa ao modelo.", body: "EstimarConsumo",
                responses: {
                    200: ok("Consumo diário e mensal calculado ou estimado.", { origem: "calculo_com_dados_informados", estimativa: false, aparelho: { nome: "Televisão", tipo: "TV" }, potenciaConsideradaW: 100, horasUsoPorDia: 5, quantidade: 1, diasNoMes: 30, consumoEstimadoKwhDia: 0.5, consumoEstimadoKwhMes: 15 }),
                    400: err("Nome do aparelho ou parâmetros numéricos fora dos limites.", "Informe o nome do aparelho."),
                    429: err("Limite de chamadas à IA ou limite do provedor Gemini atingido.", "Você atingiu o limite temporário de solicitações à IA. Tente novamente em um minuto."),
                    502: err("O Gemini não retornou parâmetros válidos para a estimativa.", "Não foi possível obter uma resposta do Gemini."),
                    503: err("Configuração ausente ou serviço Gemini temporariamente indisponível.", "O Gemini está temporariamente indisponível ou sobrecarregado. Tente novamente."),
                    504: err("A solicitação ao Gemini excedeu o tempo limite.", "O Gemini demorou demais para responder. Tente novamente.")
                }
            })
        },
        "/ia/dispositivos/{id}/analisar-anomalias": {
            post: operation({
                tag: "IA", summary: "Analisar anomalias de telemetria de um dispositivo", description: "Analisa telemetria real ou um gráfico modelo selecionado. O retorno não constitui diagnóstico técnico do aparelho.", params: [id], body: "AnalisarAnomalias",
                responses: {
                    200: ok("Resultado da análise da telemetria.", { dispositivo: { id: device.id, nome: device.nome, tipo: device.tipo }, status: "dados_insuficientes", resumo: "A série não permite concluir se há anomalia.", anomalias: [], possiveisCausas: [], recomendacoes: [], confianca: "baixa", limitacoes: "A análise depende da quantidade e qualidade das leituras." }),
                    400: err("ID de dispositivo/gráfico ou especificações técnicas inválidas.", "ID do dispositivo inválido."),
                    404: err("Dispositivo ou gráfico modelo não encontrado para o usuário.", "Dispositivo não encontrado."),
                    409: err("Não existem telemetrias suficientes para análise.", "Este dispositivo ainda não possui telemetrias reais registradas. Crie ou selecione um gráfico modelo para testar a análise."),
                    429: err("Limite de chamadas à IA ou limite do provedor Gemini atingido.", "Você atingiu o limite temporário de solicitações à IA. Tente novamente em um minuto."),
                    502: err("O Gemini não conseguiu responder ou interpretar o resultado.", "Não foi possível obter uma resposta do Gemini."),
                    503: err("Configuração ausente ou serviço Gemini temporariamente indisponível.", "O Gemini está temporariamente indisponível ou sobrecarregado. Tente novamente."),
                    504: err("A solicitação ao Gemini excedeu o tempo limite.", "O Gemini demorou demais para responder. Tente novamente."),
                    500: err("Falha interna ao consultar a telemetria no banco de dados.", "Não foi possível consultar os dados no banco.")
                }
            })
        },
        "/graficos-modelo": {
            get: operation({
                tag: "Gráficos modelo", summary: "Listar gráficos simulados do usuário", description: "Lista somente sessões de telemetria com origem `modelo_artificial` associadas aos dispositivos do usuário.",
                responses: {
                    200: ok("Lista de gráficos modelo; pode estar vazia.", []),
                    500: err("Falha ao consultar gráficos modelo na coleção Telemetrias.", "Não foi possível listar os gráficos modelo.")
                }
            }),
            post: operation({
                tag: "Gráficos modelo", summary: "Gerar gráfico com leituras artificiais", description: "Cria entre 10 e 60 leituras simuladas e as salva na coleção Telemetrias com `origem: modelo_artificial`. Esses dados não representam medições reais.", body: "CriarGraficoModelo",
                responses: {
                    201: ok("Gráfico modelo criado e salvo em Telemetrias.", { mensagem: "Gráfico modelo criado e salvo em Telemetrias.", origem: "modelo_artificial", estimativa: true, aviso: "DADOS SIMULADOS: este gráfico não representa medições reais.", grafico: { id: "665f1a2b3c4d5e6f78901237", nome: "Modelo - TV da sala", minutoAtual: 30, consumoAcumulado: 2.5 } }),
                    400: err("ObjectId do dispositivo ou quantidade de leituras inválida.", "Informe um ID MongoDB válido para o aparelho."),
                    404: err("Aparelho não encontrado na conta do usuário.", "Aparelho não encontrado na sua conta."),
                    500: err("Falha ao criar e salvar as leituras artificiais.", "Não foi possível criar o gráfico modelo.")
                }
            })
        },
        "/graficos-modelo/{id}": {
            get: operation({
                tag: "Gráficos modelo", summary: "Consultar gráfico modelo", params: [id],
                responses: {
                    200: ok("Gráfico modelo encontrado.", { id: "665f1a2b3c4d5e6f78901237", nome: "Modelo - TV da sala", origem: "modelo_artificial", minutoAtual: 30, consumoAcumulado: 2.5 }),
                    400: err("ID do gráfico modelo não é um ObjectId válido.", "ID do gráfico modelo inválido."),
                    404: err("Gráfico modelo não existe ou não pertence a dispositivo do usuário.", "Gráfico modelo não encontrado."),
                    500: err("Falha ao consultar o gráfico modelo.", "Não foi possível carregar o gráfico modelo.")
                }
            }),
            delete: operation({
                tag: "Gráficos modelo", summary: "Excluir gráfico modelo", params: [id],
                responses: {
                    200: ok("Sessão artificial removida da coleção Telemetrias.", { mensagem: "Gráfico modelo removido de Telemetrias com sucesso." }),
                    400: err("ID do gráfico modelo não é um ObjectId válido.", "ID do gráfico modelo inválido."),
                    404: err("Gráfico modelo não existe ou não pertence a dispositivo do usuário.", "Gráfico modelo não encontrado."),
                    500: err("Falha ao remover o gráfico modelo.", "Não foi possível excluir o gráfico modelo.")
                }
            })
        }
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "Informe o token retornado por POST /usuarios/login."
            }
        },
        schemas: {
            CadastroUsuario: {
                type: "object", required: ["nome", "email", "senha"],
                properties: { nome: { type: "string", example: "Maria Silva" }, email: { type: "string", format: "email", example: "maria@exemplo.com" }, senha: { type: "string", format: "password", example: "SenhaSegura123" } }
            },
            ConfirmarEmail: {
                type: "object", required: ["email", "codigo"],
                properties: { email: { type: "string", format: "email" }, codigo: { type: "string", example: "123456" } }
            },
            Login: {
                type: "object", required: ["email", "senha"],
                properties: { email: { type: "string", format: "email", example: "maria@exemplo.com" }, senha: { type: "string", format: "password" } }
            },
            SolicitarRecuperacao: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } },
            VerificarRecuperacao: { type: "object", required: ["email", "codigo"], properties: { email: { type: "string", format: "email" }, codigo: { type: "string" } } },
            RedefinirSenha: { type: "object", required: ["email", "codigo", "novaSenha"], properties: { email: { type: "string", format: "email" }, codigo: { type: "string" }, novaSenha: { type: "string", format: "password", minLength: 8 } } },
            AtualizarPerfil: {
                type: "object", required: ["nome", "email"],
                properties: { nome: { type: "string" }, email: { type: "string", format: "email" }, fotoPerfil: { type: "string", nullable: true }, senhaAtual: { type: "string", format: "password" }, novaSenha: { type: "string", format: "password", minLength: 8 } }
            },
            CriarDispositivo: { type: "object", required: ["nome", "tipo"], properties: { nome: { type: "string", example: "Televisão da sala" }, tipo: { type: "string", example: "TV" } } },
            VincularControleSamsung: {
                type: "object", required: ["provedor", "ip"],
                properties: { provedor: { type: "string", enum: ["samsung_ip_control"] }, ip: { type: "string", format: "ipv4", example: "192.168.15.168" }, nome: { type: "string", maxLength: 100 }, modelo: { type: "string", maxLength: 100 } }
            },
            CriarEquipe: {
                type: "object", required: ["nome", "setor", "limiteIntegrantes"],
                properties: { nome: { type: "string", maxLength: 80 }, descricao: { type: "string", nullable: true }, imagemFundo: { type: "string", nullable: true }, logo: { type: "string", nullable: true }, plano: { type: "string", default: "Básico" }, setor: { type: "string", enum: ["Industrial", "Educação", "Saúde", "Outros"] }, limiteIntegrantes: { type: "integer", minimum: 5 } }
            },
            AtualizarEquipe: {
                type: "object", additionalProperties: false,
                properties: { nome: { type: "string", maxLength: 80 }, descricao: { type: "string", nullable: true }, imagemFundo: { type: "string", nullable: true }, logo: { type: "string", nullable: true }, setor: { type: "string", enum: ["Industrial", "Educação", "Saúde", "Outros"] }, limiteIntegrantes: { type: "integer" } }
            },
            EntrarEquipe: { type: "object", required: ["codigo"], properties: { codigo: { type: "string", example: "A1B2C3D4" } } },
            AlterarCargoIntegrante: { type: "object", required: ["cargoId"], properties: { cargoId: { type: "string" } } },
            CriarCargo: {
                type: "object", required: ["nome", "cor"],
                properties: { nome: { type: "string", minLength: 2, maxLength: 40 }, descricao: { type: "string", maxLength: 180 }, cor: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$", example: "#8060A8" }, permissoes: { type: "object", additionalProperties: { type: "boolean" } } }
            },
            AcaoRotina: { type: "object", properties: { ordem: { type: "integer" }, tipo: { type: "string" }, horario: { type: "string" }, instrucoes: { type: "object", additionalProperties: true } }, additionalProperties: true },
            CriarRotina: {
                type: "object", required: ["nome", "horarioInicial", "diasSemana", "acoes", "dispositivoId"],
                properties: {
                    nome: { type: "string" }, descricao: { type: "string", nullable: true }, horarioInicial: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$", example: "08:00" }, horarioFinal: { type: "string", nullable: true, example: "18:00" },
                    diasSemana: { type: "object", properties: { segunda: { type: "boolean" }, terca: { type: "boolean" }, quarta: { type: "boolean" }, quinta: { type: "boolean" }, sexta: { type: "boolean" }, sabado: { type: "boolean" }, domingo: { type: "boolean" } }, additionalProperties: false },
                    acoes: { type: "array", items: { type: "object", required: ["ordem", "horario", "tipo", "instrucoes"], properties: { ordem: { type: "integer", minimum: 1 }, horario: { type: "string" }, tipo: { type: "string", enum: ["ligar", "alterar_estado", "desligar"] }, instrucoes: { type: "object", additionalProperties: true } } } },
                    dispositivoId: { type: "string", description: "deviceId público do dispositivo FHIVE." }
                }
            },
            CriarRotinaEquipe: {
                type: "object", required: ["nome", "horarioInicial", "horarioFinal", "diasSemana", "acoes"],
                properties: { nome: { type: "string", maxLength: 80 }, descricao: { type: "string", maxLength: 240 }, horarioInicial: { type: "string", example: "08:00" }, horarioFinal: { type: "string", example: "18:00" }, diasSemana: { type: "array", items: { type: "string", enum: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] } }, acoes: { type: "array", items: { type: "object", required: ["id", "nome", "descricao", "horario"], properties: { id: { type: "string" }, nome: { type: "string" }, descricao: { type: "string" }, horario: { type: "string" } } } } }
            },
            PerguntarIA: { type: "object", required: ["pergunta"], properties: { pergunta: { type: "string", maxLength: 1800 }, aparelho: { type: "object", nullable: true, additionalProperties: true }, historico: { type: "array", maxItems: 8, items: { type: "object", required: ["papel", "texto"], properties: { papel: { type: "string", enum: ["user", "assistant"] }, texto: { type: "string", maxLength: 1200 } } } } } },
            EstimarConsumo: {
                type: "object", required: ["nome"],
                properties: { nome: { type: "string", maxLength: 100 }, tipo: { type: "string", maxLength: 100 }, marca: { type: "string", maxLength: 80 }, modelo: { type: "string", maxLength: 100 }, potenciaW: { type: "number", minimum: 0.1, maximum: 100000 }, horasPorDia: { type: "number", minimum: 0.1, maximum: 24 }, quantidade: { type: "integer", minimum: 1, maximum: 100, default: 1 }, diasNoMes: { type: "integer", minimum: 1, maximum: 31, default: 30 } }
            },
            AnalisarAnomalias: { type: "object", properties: { especificacoes: { type: "object", additionalProperties: true, properties: { potenciaNominalW: { type: "number" }, tensaoNominalV: { type: "number" }, correnteNominalA: { type: "number" }, consumoEsperadoWhPorMinuto: { type: "number" }, descricaoUso: { type: "string" } } }, graficoModeloId: { type: "string" } } },
            CriarGraficoModelo: { type: "object", required: ["dispositivoId"], properties: { dispositivoId: { type: "string", description: "ObjectId MongoDB do dispositivo." }, quantidadeLeituras: { type: "integer", minimum: 10, maximum: 60, default: 30 }, nome: { type: "string", maxLength: 80 } } }
        }
    }
};

export default openapi;
