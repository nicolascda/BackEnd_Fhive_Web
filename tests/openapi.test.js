import assert from "node:assert/strict";
import test from "node:test";
import openapi from "../src/docs/openapi.js";

const getOperation = (path, method) => openapi.paths[path]?.[method];

test("OpenAPI lista os caminhos principais das rotas FHIVE", () => {
    const caminhos = Object.keys(openapi.paths);
    for (const caminho of [
        "/usuarios", "/usuarios/perfil", "/dispositivos", "/dispositivos/{id}/controle",
        "/rotinas", "/equipes", "/equipes/{id}/integrantes", "/equipes/{id}/cargos",
        "/ia/perguntar", "/graficos-modelo"
    ]) {
        assert.ok(caminhos.includes(caminho), `Caminho ausente: ${caminho}`);
    }
});

test("GET /usuarios não documenta erro de imagem 413 nem conflito 409", () => {
    const operacao = getOperation("/usuarios", "get");
    assert.ok(operacao.responses[200]);
    assert.ok(operacao.responses[401]);
    assert.ok(operacao.responses[500]);
    assert.equal(operacao.responses[413], undefined);
    assert.equal(operacao.responses[409], undefined);
    assert.equal(operacao.responses[404], undefined);
    assert.equal(operacao.responses[200].content["application/json"].schema.type, "array");
});

test("413 aparece apenas nas operações de imagem que realmente validam tamanho", () => {
    assert.ok(getOperation("/usuarios/perfil", "patch").responses[413]);
    assert.ok(getOperation("/equipes", "post").responses[413]);
    assert.ok(getOperation("/equipes/{id}", "patch").responses[413]);

    for (const [path, method] of [
        ["/usuarios", "get"],
        ["/dispositivos", "get"],
        ["/dispositivos/{id}/controle", "get"],
        ["/rotinas", "get"],
        ["/graficos-modelo", "get"],
        ["/ia/perguntar", "post"]
    ]) {
        assert.equal(getOperation(path, method).responses[413], undefined, `${method.toUpperCase()} ${path} não deve listar 413`);
    }
});

test("cada resposta documentada contém descrição e exemplo coerentes com a operação", () => {
    for (const [path, pathItem] of Object.entries(openapi.paths)) {
        for (const [method, operacao] of Object.entries(pathItem)) {
            for (const [status, resposta] of Object.entries(operacao.responses)) {
                assert.ok(resposta.description, `Sem descrição: ${method} ${path} ${status}`);
                if (status !== "204") {
                    const media = resposta.content?.["application/json"];
                    assert.ok(media, `Sem application/json: ${method} ${path} ${status}`);
                    assert.ok(media.example !== undefined, `Sem exemplo: ${method} ${path} ${status}`);
                }
            }
        }
    }
});

test("exemplos de erros não repetem a mensagem genérica para todos os status", () => {
    const exemplos = [];
    for (const pathItem of Object.values(openapi.paths)) {
        for (const operacao of Object.values(pathItem)) {
            for (const [status, resposta] of Object.entries(operacao.responses)) {
                if (Number(status) >= 400) {
                    exemplos.push(JSON.stringify(resposta.content?.["application/json"]?.example));
                }
            }
        }
    }
    assert.ok(exemplos.length > 0);
    const exemplosSemAuth = exemplos.filter((texto) => !texto.includes("Token não informado."));
    assert.ok(new Set(exemplosSemAuth).size >= 10, "As operações devem ter exemplos de erro específicos, não uma resposta única compartilhada.");
    assert.ok(!exemplos.some((texto) => texto === JSON.stringify({ mensagem: "Não foi possível processar a solicitação." })));
});

test("GET /usuarios documenta a resposta como lista, não como objeto genérico", () => {
    const exemplo = getOperation("/usuarios", "get").responses[200].content["application/json"].example;
    assert.ok(Array.isArray(exemplo));
    assert.deepEqual(Object.keys(exemplo[0]).sort(), ["createdAt", "email", "id", "nome"]);
});
