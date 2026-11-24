
import https from 'node:https';

const ip = '192.168.15.168';
const porta = 1516;

const corpo = JSON.stringify({
    jsonrpc: '2.0',
    id: '1',
    method: 'createAccessToken'
});

const agente = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: false
});

console.log('==========================================');
console.log(' FHIVE - TESTE SAMSUNG IP CONTROL');
console.log('==========================================');
console.log(`IP: ${ip}`);
console.log(`Porta: ${porta}`);
console.log('Protocolo: HTTPS + JSON-RPC');
console.log('Método: createAccessToken');
console.log('');
console.log('Iniciando conexão...');

const requisicao = https.request({
    hostname: ip,
    port: porta,
    path: '/',
    method: 'POST',

    headers: {
        Host: `${ip}:${porta}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(corpo),
        Connection: 'close'
    },

    agent: agente,
    timeout: 20000

}, resposta => {

    let retorno = '';

    console.log('\nHTTPS estabelecido!');
    console.log('Status HTTP:', resposta.statusCode);
    console.log(
        'Servidor:',
        resposta.headers.server || 'Não informado'
    );
    console.log(
        'Protocolo TLS:',
        resposta.socket.getProtocol()
    );

    resposta.setEncoding('utf8');

    resposta.on('data', parte => {
        retorno += parte;
    });

    resposta.on('end', () => {

        console.log('\nResposta recebida da TV.');

        let resultado;

        try {
            resultado = JSON.parse(retorno);
        } catch {
            console.log('A resposta não contém JSON válido.');
            console.log('Conteúdo:', retorno.slice(0, 500));
            agente.destroy();
            return;
        }

        const token =
            resultado?.result?.AccessToken ??
            resultado?.result?.accessToken ??
            resultado?.AccessToken ??
            resultado?.accessToken;

        if (
            resposta.statusCode >= 200 &&
            resposta.statusCode < 300 &&
            typeof token === 'string' &&
            token.trim().length > 0
        ) {
            console.log('\n================================');
            console.log('PAREAMENTO REALIZADO COM SUCESSO!');
            console.log('================================');
            console.log('Token recebido: SIM');
            console.log('Token não será exibido no console.');
            console.log('A TV respondeu corretamente ao IP Control.');
        } else {
            console.log('\nA TV não confirmou a autorização.');
            console.log('Resposta:', JSON.stringify({
                ...resultado,
                result: resultado.result
                    ? {
                        ...resultado.result,
                        AccessToken: resultado.result.AccessToken
                            ? '[OCULTO]'
                            : undefined,
                        accessToken: resultado.result.accessToken
                            ? '[OCULTO]'
                            : undefined
                    }
                    : resultado.result
            }, null, 2));
        }

        console.log('\nTeste finalizado.');
        agente.destroy();
    });

    resposta.on('error', erro => {
        console.error('Erro ao ler resposta:', erro.message);
        agente.destroy();
    });
});

requisicao.on('socket', socket => {
    socket.on('secureConnect', () => {
        console.log('\nHandshake TLS concluído!');
        console.log('Versão TLS:', socket.getProtocol());
        console.log('Cifra:', socket.getCipher()?.name);
    });
});

requisicao.on('timeout', () => {
    requisicao.destroy(
        new Error('Tempo esgotado aguardando a televisão.')
    );
});

requisicao.on('error', erro => {
    console.log('\n================================');
    console.log('FALHA NA COMUNICAÇÃO');
    console.log('================================');
    console.log('Tipo:', erro.name);
    console.log('Código:', erro.code || 'Não informado');
    console.log('Detalhes:', erro.message);

    agente.destroy();
});

console.log('JSON enviado:', corpo);
console.log('Content-Length:', Buffer.byteLength(corpo));

requisicao.end(corpo);
