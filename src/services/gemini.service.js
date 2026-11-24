import { GoogleGenAI } from "@google/genai";

let clienteGemini = null;

class ErroConfiguracaoGemini extends Error {
    constructor(mensagem) {
        super(mensagem);
        this.name = "ErroConfiguracaoGemini";
        this.code = "GEMINI_CONFIG_MISSING";
    }
}

function obterClienteGemini() {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
        throw new ErroConfiguracaoGemini(
            "GEMINI_API_KEY não foi encontrada no arquivo .env."
        );
    }

    if (!clienteGemini) {
        clienteGemini = new GoogleGenAI({
            apiKey,

            httpOptions: {
                timeout: 30000,

                retryOptions: {
                    attempts: 2,
                    initialDelay: 1,
                    maxDelay: 3,
                    expBase: 2,
                    jitter: 1,
                    httpStatusCodes: [
                        408,
                        429,
                        500,
                        502,
                        503,
                        504
                    ]
                }
            }
        });
    }

    return clienteGemini;
}

function obterModeloGemini() {
    return process.env.GEMINI_MODEL?.trim() ||
        "gemini-3.8-flash";
}

export async function gerarRespostaGemini({
    instrucaoSistema,
    prompt,
    temperatura = 0.3,
    maxOutputTokens = 1200,
    responseJsonSchema,
    thinkingLevel = "low"
}) {
    if (typeof prompt !== "string" || !prompt.trim()) {
        throw new Error("O prompt enviado ao Gemini está vazio.");
    }

    const cliente = obterClienteGemini();

    const config = {
        systemInstruction: instrucaoSistema,
        temperature: temperatura,
        maxOutputTokens,

        thinkingConfig: {
            thinkingLevel
        }
    };

    if (responseJsonSchema) {
        config.responseMimeType = "application/json";
        config.responseJsonSchema = responseJsonSchema;
    }

    const inicio = Date.now();

    try {
        const resposta = await cliente.models.generateContent({
            model: obterModeloGemini(),
            contents: prompt,
            config
        });

        const texto = resposta.text?.trim();

        if (!texto) {
            throw new Error("O Gemini retornou uma resposta vazia.");
        }

        console.log(
            `[Gemini] Resposta recebida em ${Date.now() - inicio}ms.`
        );

        return texto;

    } catch (erro) {
        console.error(
            `[Gemini] Erro após ${Date.now() - inicio}ms:`,
            {
                nome: erro?.name,
                mensagem: erro?.message,
                status: erro?.status,
                codigo: erro?.code,
                causa: erro?.cause?.message
            }
        );

        throw erro;
    }
}

export function interpretarJsonGemini(texto) {
    if (typeof texto !== "string" || !texto.trim()) {
        throw new Error("Resposta JSON vazia recebida do Gemini.");
    }

    try {
        return JSON.parse(texto);

    } catch {
        const textoLimpo = texto
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        return JSON.parse(textoLimpo);
    }
}

export function obterModeloConfigurado() {
    return obterModeloGemini();
}