import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function testarGemini() {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    const modelo =
        process.env.GEMINI_MODEL || "gemini-3.8-flash";

    if (!apiKey) {
        console.error("GEMINI_API_KEY não encontrada.");
        process.exitCode = 1;
        return;
    }

    const cliente = new GoogleGenAI({
        apiKey,

        httpOptions: {
            timeout: 30000,

            retryOptions: {
                attempts: 1
            }
        }
    });

    console.log("Testando conexão com o Gemini...");
    console.log("Modelo:", modelo);

    const inicio = Date.now();

    try {
        const resposta = await cliente.models.generateContent({
            model: modelo,

            contents: "Responda somente: Conexão com Gemini funcionando!",

            config: {
                temperature: 0.1,
                maxOutputTokens: 50,

                thinkingConfig: {
                    thinkingLevel: "low"
                }
            }
        });

        console.log("\nConexão estabelecida!");
        console.log("Tempo:", Date.now() - inicio, "ms");
        console.log("Resposta:", resposta.text);

    } catch (erro) {
        console.error("\nFalha na conexão:");

        console.error({
            nome: erro?.name,
            mensagem: erro?.message,
            status: erro?.status,
            codigo: erro?.code,
            causa: erro?.cause?.message
        });

        process.exitCode = 1;
    }
}

testarGemini();