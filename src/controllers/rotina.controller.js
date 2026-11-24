import prisma from "../data/prisma.js";
import {
    erro as erroEquipe,
    idValido as idEquipeValido,
    obterContextoEquipe,
    pode
} from "../services/equipe.service.js";

const diasValidos = [ "segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"
];

const tiposAcaoValidos = [
    "ligar",
    "alterar_estado",
    "desligar"
];

const horarioValido = (h) =>
    typeof h === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(h);

const horarioEmMinutos = (h) => {
    const [hora, minuto] = h.split(":").map(Number);
    return hora * 60 + minuto;
};

const diasSemanaValidos = (dias) => {
    if (
        !dias ||
        typeof dias !== "object" ||
        Array.isArray(dias)
    ) {
        return false;
    }

    const nomes = Object.keys(dias);

    return (
        nomes.length > 0 &&
        nomes.every(
            (dia) =>
                diasValidos.includes(dia) &&
                typeof dias[dia] === "boolean"
        ) &&
        Object.values(dias).some(Boolean)
    );
};

const validarAcoes = ( acoes, horarioInicial, horarioFinal ) => {
    if (!Array.isArray(acoes) || !acoes.length) {
        return "A rotina deve possuir pelo menos uma ação.";
    }

    const ordens = new Set();

    for (const acao of acoes) {
        if (
            !acao ||
            typeof acao !== "object" ||
            Array.isArray(acao)
        ) {
            return "Cada ação deve ser um objeto válido.";
        }

        if (
            !Number.isInteger(acao.ordem) ||
            acao.ordem <= 0
        ) {
            return "A ordem de cada ação deve ser um número inteiro maior que zero.";
        }

        if (ordens.has(acao.ordem)) {
            return `A ordem ${acao.ordem} está repetida.`;
        }

        ordens.add(acao.ordem);

        if (!horarioValido(acao.horario)) {
            return `O horário da ação ${acao.ordem} deve estar no formato HH:mm.`;
        }

        const horario = horarioEmMinutos(acao.horario);

        if (horario < horarioEmMinutos(horarioInicial)) {
            return `O horário da ação ${acao.ordem} não pode ser menor que o horário inicial da rotina.`;
        }

        if (
            horarioFinal &&
            horario > horarioEmMinutos(horarioFinal)
        ) {
            return `O horário da ação ${acao.ordem} não pode ser maior que o horário final da rotina.`;
        }

        if (!tiposAcaoValidos.includes(acao.tipo)) {
            return `O tipo da ação ${acao.ordem} é inválido.`;
        }

        if (
            !acao.instrucoes ||
            typeof acao.instrucoes !== "object" ||
            Array.isArray(acao.instrucoes)
        ) {
            return `As instruções da ação ${acao.ordem} devem ser um objeto.`;
        }
    }

    return null;
};

const erro500 = (res, mensagem, error) =>
    res.status(500).json({
        mensagem,
        erro: error.message
    });

export const criarRotina = async (req, res) => {
    try {
        const { nome, descricao, horarioInicial, horarioFinal, diasSemana, acoes, dispositivoId
        } = req.body;

        const usuarioId = req.usuario.id;

        if ( !nome || !horarioInicial || !diasSemana || !acoes || !dispositivoId ) 
        {
            return res.status(400).json({
                mensagem:
                    "Nome, horário inicial, dias da semana, ações e dispositivo são obrigatórios."
            });
        }

        if (nome.trim().length === 0) {
            return res.status(400).json({
                mensagem: "O nome da rotina é inválido."
            });
        }

        if (!horarioValido(horarioInicial)) {
            return res.status(400).json({
                mensagem:
                    "O horário inicial deve estar no formato HH:mm."
            });
        }

        if ( horarioFinal !== undefined && horarioFinal !== null )
        {
            if (!horarioValido(horarioFinal)) {
                return res.status(400).json({
                    mensagem:
                        "O horário final deve estar no formato HH:mm."
                });
            }

            if ( horarioEmMinutos(horarioFinal) < horarioEmMinutos(horarioInicial) ) {
                return res.status(400).json({
                    mensagem:
                        "O horário final não pode ser menor que o horário inicial."
                });
            }
        }

        if (!diasSemanaValidos(diasSemana)) {
            return res.status(400).json({
                mensagem: "Os dias da semana informados são inválidos."
            });
        }

        const erroAcoes = validarAcoes( acoes, horarioInicial, horarioFinal );

        if (erroAcoes) {
            return res.status(400).json({
                mensagem: erroAcoes
            });
        }

        const rotinaExistente = await prisma.rotinas.findFirst({
            where: {
                nome: nome.trim(),
                usuarioId
            }
        });

        if (rotinaExistente) {
            return res.status(409).json({
                mensagem: "Já existe uma rotina com esse nome."
            });
        }

        const dispositivo = await prisma.dispositivos.findFirst({
            where: {
                deviceId: dispositivoId,
                usuarioId
            }
        });

        if (!dispositivo) {
            return res.status(404).json({
                mensagem: "Dispositivo não encontrado."
            });
        }

        const rotina = await prisma.rotinas.create({
            data: {
                nome: nome.trim(),
                descricao: descricao?.trim() || null,
                horarioInicial,
                horarioFinal: horarioFinal || null,
                diasSemana,
                acoes,
                usuarioId,
                dispositivoId: dispositivo.id
            }
        });

        return res.status(201).json({
            mensagem: "Rotina criada com sucesso.",
            rotina
        });
    } catch (error) {
        console.error("Erro ao criar rotina:", error);
        return erro500(res, "Erro ao criar rotina.", error);
    }
};

export const listarRotinas = async (req, res) => {
    try {
        const rotinas = await prisma.rotinas.findMany({
            where: {
                usuarioId: req.usuario.id
            },
            orderBy: {
                createdAt: "desc"
            },
            include: {
                dispositivo: true
            }
        });

        return res.status(200).json(rotinas);
    } catch (error) {
        console.error("Erro ao listar rotinas:", error);
        return erro500(res, "Erro ao listar rotinas.", error);
    }
};

export const buscarRotina = async (req, res) => {
    try {
        const rotina = await prisma.rotinas.findFirst({
            where: {
                id: req.params.id,
                usuarioId: req.usuario.id
            },
            include: {
                dispositivo: true
            }
        });

        if (!rotina) {
            return res.status(404).json({
                mensagem: "Rotina não encontrada."
            });
        }

        return res.status(200).json(rotina);
    } catch (error) {
        console.error("Erro ao buscar rotina:", error);
        return erro500(res, "Erro ao buscar rotina.", error);
    }
};

export const atualizarRotina = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id;

        const rotina = await prisma.rotinas.findFirst({
            where: {
                id,
                usuarioId
            }
        });

        if (!rotina) {
            return res.status(404).json({
                mensagem: "Rotina não encontrada."
            });
        }

        const { nome, descricao, ativo, horarioInicial, horarioFinal, diasSemana, acoes, dispositivoId
        } = req.body;

        if (
            nome !== undefined &&
            nome.trim().length === 0
        ) {
            return res.status(400).json({
                mensagem: "O nome da rotina é inválido."
            });
        }

        if (
            horarioInicial !== undefined &&
            !horarioValido(horarioInicial)
        ) {
            return res.status(400).json({
                mensagem:
                    "O horário inicial deve estar no formato HH:mm."
            });
        }

        if (
            horarioFinal !== undefined &&
            horarioFinal !== null &&
            !horarioValido(horarioFinal)
        ) {
            return res.status(400).json({
                mensagem:
                    "O horário final deve estar no formato HH:mm."
            });
        }

        if (
            diasSemana !== undefined &&
            !diasSemanaValidos(diasSemana)
        ) {
            return res.status(400).json({
                mensagem:
                    "Os dias da semana informados são inválidos."
            });
        }

        if (nome !== undefined) {
            const rotinaExistente = await prisma.rotinas.findFirst({
                where: {
                    nome: nome.trim(),
                    usuarioId,
                    NOT: {
                        id
                    }
                }
            });

            if (rotinaExistente) {
                return res.status(409).json({
                    mensagem: "Já existe uma rotina com esse nome."
                });
            }
        }

        const novoHorarioInicial =
            horarioInicial ?? rotina.horarioInicial;

        const novoHorarioFinal =
            horarioFinal !== undefined ? horarioFinal : rotina.horarioFinal;

        const novasAcoes =
            acoes !== undefined ? acoes : rotina.acoes;

        if (
            novoHorarioFinal &&
            horarioEmMinutos(novoHorarioFinal) <
            horarioEmMinutos(novoHorarioInicial)
        ) {
            return res.status(400).json({
                mensagem:
                    "O horário final não pode ser menor que o horário inicial."
            });
        }

        const erroAcoes = validarAcoes(
            novasAcoes,
            novoHorarioInicial,
            novoHorarioFinal
        );

        if (erroAcoes) {
            return res.status(400).json({
                mensagem: erroAcoes
            });
        }

        let novoDispositivoId;

        if (dispositivoId !== undefined) {
            const dispositivo = await prisma.dispositivos.findFirst({
                where: {
                    deviceId: dispositivoId,
                    usuarioId
                }
            });

            if (!dispositivo) {
                return res.status(404).json({
                    mensagem: "Dispositivo não encontrado."
                });
            }

            novoDispositivoId = dispositivo.id;
        }

        const rotinaAtualizada = await prisma.rotinas.update({
            where: {
                id
            },
            data: {
                nome:
                    nome !== undefined
                        ? nome.trim()
                        : undefined,

                descricao:
                    descricao !== undefined
                        ? descricao?.trim() || null
                        : undefined,

                ativo,
                horarioInicial,
                horarioFinal,
                diasSemana,
                acoes,
                dispositivoId: novoDispositivoId
            }
        });

        return res.status(200).json({
            mensagem: "Rotina atualizada com sucesso.",
            rotina: rotinaAtualizada
        });
    } catch (error) {
        console.error("Erro ao atualizar rotina:", error);
        return erro500(res, "Erro ao atualizar rotina.", error);
    }
};

export const excluirRotina = async (req, res) => {
    try {
        const rotina = await prisma.rotinas.findFirst({
            where: {
                id: req.params.id,
                usuarioId: req.usuario.id
            }
        });

        if (!rotina) {
            return res.status(404).json({
                mensagem: "Rotina não encontrada."
            });
        }

        await prisma.rotinas.delete({
            where: {
                id: rotina.id
            }
        });

        return res.status(200).json({
            mensagem: "Rotina excluída com sucesso."
        });
    } catch (error) {
        console.error("Erro ao excluir rotina:", error);
        return erro500(res, "Erro ao excluir rotina.", error);
    }
};

// Rotina relacionada ao frontEnd de equipes

const diasEquipeValidos = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const horarioEquipeValido = (valor) =>
    typeof valor === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
const minutosEquipe = (horario) => {
    const [hora, minuto] = horario.split(":").map(Number);
    return hora * 60 + minuto;
};

function validarRotinaEquipe(dados) {
    if (typeof dados.nome !== "string" || !dados.nome.trim() || dados.nome.trim().length > 80) {
        return "Informe um nome para a rotina com até 80 caracteres.";
    }
    if (dados.descricao !== undefined && dados.descricao !== null && typeof dados.descricao !== "string") {
        return "A descrição da rotina é inválida.";
    }
    if (typeof dados.descricao === "string" && dados.descricao.length > 240) {
        return "A descrição deve ter no máximo 240 caracteres.";
    }
    if (!horarioEquipeValido(dados.horarioInicial)) {
        return "O horário inicial deve estar no formato HH:mm.";
    }
    if (!horarioEquipeValido(dados.horarioFinal)) {
        return "O horário final deve estar no formato HH:mm.";
    }
    if (minutosEquipe(dados.horarioFinal) < minutosEquipe(dados.horarioInicial)) {
        return "O horário final precisa ser posterior ao inicial.";
    }
    if (
        !Array.isArray(dados.diasSemana) ||
        !dados.diasSemana.length ||
        dados.diasSemana.some((dia) => !diasEquipeValidos.includes(dia)) ||
        new Set(dados.diasSemana).size !== dados.diasSemana.length
    ) {
        return "Selecione pelo menos um dia da semana válido.";
    }
    if (!Array.isArray(dados.acoes) || !dados.acoes.length) {
        return "Adicione pelo menos uma ação à rotina.";
    }

    for (let indice = 0; indice < dados.acoes.length; indice += 1) {
        const acao = dados.acoes[indice];
        if (!acao || typeof acao !== "object" || Array.isArray(acao)) {
            return `A ação ${indice + 1} é inválida.`;
        }
        if (typeof acao.id !== "string" || !acao.id.trim()) {
            return `A ação ${indice + 1} não possui um identificador válido.`;
        }
        if (typeof acao.nome !== "string" || !acao.nome.trim() || acao.nome.trim().length > 80) {
            return `Informe um nome válido para a ação ${indice + 1}.`;
        }
        if (typeof acao.descricao !== "string" || acao.descricao.length > 160) {
            return `A instrução da ação ${indice + 1} é inválida.`;
        }
        if (!horarioEquipeValido(acao.horario)) {
            return `O horário da ação ${indice + 1} deve estar no formato HH:mm.`;
        }
        if (
            minutosEquipe(acao.horario) < minutosEquipe(dados.horarioInicial) ||
            minutosEquipe(acao.horario) > minutosEquipe(dados.horarioFinal)
        ) {
            return `A ação ${indice + 1} precisa ficar entre o início e o fim da rotina.`;
        }
        if (indice > 0 && minutosEquipe(acao.horario) < minutosEquipe(dados.acoes[indice - 1].horario)) {
            return "As ações precisam estar em ordem cronológica.";
        }
    }

    return null;
}

async function obterEquipeParaRotina(req, res, permissao) {
    const contexto = await obterContextoEquipe(req.params.equipeId, req.usuario.id);
    if (contexto.mensagem) {
        erroEquipe(res, contexto.status, contexto.mensagem);
        return null;
    }
    if (!pode(contexto, permissao)) {
        erroEquipe(res, 403, "Seu cargo não permite realizar esta operação nesta equipe.");
        return null;
    }
    return contexto.equipe;
}

export const listarRotinasEquipe = async (req, res) => {
    try {
        const equipe = await obterEquipeParaRotina(req, res, "visualizarAmbiente");
        if (!equipe) return;

        const rotinas = await prisma.rotinas.findMany({
            where: { equipeId: equipe.id },
            orderBy: { createdAt: "desc" }
        });

        return res.status(200).json({ rotinas });
    } catch (error) {
        console.error("Erro ao listar rotinas da equipe:", error);
        return erroEquipe(res, 500, "Não foi possível carregar as rotinas da equipe.");
    }
};

export const criarRotinaEquipe = async (req, res) => {
    try {
        const equipe = await obterEquipeParaRotina(req, res, "gerenciarRotinas");
        if (!equipe) return;

        const dados = req.body || {};
        const erroValidacao = validarRotinaEquipe(dados);
        if (erroValidacao) return erroEquipe(res, 400, erroValidacao);

        const nome = dados.nome.trim();
        const existente = await prisma.rotinas.findFirst({ where: { equipeId: equipe.id, nome } });
        if (existente) return erroEquipe(res, 409, "Já existe uma rotina com esse nome nesta equipe.");

        const rotina = await prisma.rotinas.create({
            data: {
                nome,
                descricao: dados.descricao?.trim() || null,
                horarioInicial: dados.horarioInicial,
                horarioFinal: dados.horarioFinal,
                diasSemana: dados.diasSemana,
                acoes: dados.acoes.map((acao) => ({
                    id: acao.id,
                    horario: acao.horario,
                    nome: acao.nome.trim(),
                    descricao: acao.descricao.trim()
                })),
                ativo: true,
                usuarioId: req.usuario.id,
                equipeId: equipe.id
            }
        });

        return res.status(201).json({ mensagem: "Rotina salva no banco de dados.", rotina });
    } catch (error) {
        console.error("Erro ao criar rotina da equipe:", error);
        return erroEquipe(res, 500, "Não foi possível salvar a rotina.");
    }
};

export const atualizarRotinaEquipe = async (req, res) => {
    try {
        const equipe = await obterEquipeParaRotina(req, res, "gerenciarRotinas");
        if (!equipe) return;
        if (!idEquipeValido(req.params.id)) return erroEquipe(res, 400, "ID de rotina inválido.");

        const atual = await prisma.rotinas.findFirst({
            where: { id: req.params.id, equipeId: equipe.id }
        });
        if (!atual) return erroEquipe(res, 404, "Rotina não encontrada nesta equipe.");

        const dados = {
            nome: req.body.nome ?? atual.nome,
            descricao: req.body.descricao !== undefined ? req.body.descricao : (atual.descricao ?? ""),
            horarioInicial: req.body.horarioInicial ?? atual.horarioInicial,
            horarioFinal: req.body.horarioFinal ?? atual.horarioFinal,
            diasSemana: req.body.diasSemana ?? atual.diasSemana,
            acoes: req.body.acoes ?? atual.acoes
        };
        const erroValidacao = validarRotinaEquipe(dados);
        if (erroValidacao) return erroEquipe(res, 400, erroValidacao);

        const nome = dados.nome.trim();
        const nomeDuplicado = await prisma.rotinas.findFirst({
            where: { equipeId: equipe.id, nome, id: { not: atual.id } }
        });
        if (nomeDuplicado) return erroEquipe(res, 409, "Já existe outra rotina com esse nome nesta equipe.");

        const rotina = await prisma.rotinas.update({
            where: { id: atual.id },
            data: {
                nome,
                descricao: dados.descricao?.trim() || null,
                horarioInicial: dados.horarioInicial,
                horarioFinal: dados.horarioFinal,
                diasSemana: dados.diasSemana,
                acoes: dados.acoes.map((acao) => ({
                    id: acao.id,
                    horario: acao.horario,
                    nome: acao.nome.trim(),
                    descricao: acao.descricao.trim()
                }))
            }
        });

        return res.status(200).json({ mensagem: "Rotina atualizada no banco de dados.", rotina });
    } catch (error) {
        console.error("Erro ao atualizar rotina da equipe:", error);
        return erroEquipe(res, 500, "Não foi possível atualizar a rotina.");
    }
};

export const excluirRotinaEquipe = async (req, res) => {
    try {
        const equipe = await obterEquipeParaRotina(req, res, "gerenciarRotinas");
        if (!equipe) return;
        if (!idEquipeValido(req.params.id)) return erroEquipe(res, 400, "ID de rotina inválido.");

        const rotina = await prisma.rotinas.findFirst({
            where: { id: req.params.id, equipeId: equipe.id }
        });
        if (!rotina) return erroEquipe(res, 404, "Rotina não encontrada nesta equipe.");

        await prisma.rotinas.delete({ where: { id: rotina.id } });
        return res.status(200).json({ mensagem: "Rotina excluída do banco de dados." });
    } catch (error) {
        console.error("Erro ao excluir rotina da equipe:", error);
        return erroEquipe(res, 500, "Não foi possível excluir a rotina.");
    }
};