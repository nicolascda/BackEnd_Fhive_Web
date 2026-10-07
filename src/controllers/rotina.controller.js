import prisma from "../data/prisma.js";

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