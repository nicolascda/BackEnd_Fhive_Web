import https from 'node:https';

const ip = '192.168.15.168';

const corpo = JSON.stringify({
    jsonrpc: '2.0',
    id: '1',
    method: 'createAccessToken'
});

console.log('================================');
console.log('FHIVE - TESTE SAMSUNG IP CONTROL');
console.log('================================');
console.log(`IP: ${ip}:1516`);
console.log('Protocolo: HTTPS / TLS 1.2');
console.log('Método: POST');
console.log('');

const agent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: false,

    // Testa especificamente TLS 1.2.
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.2'
});

const requisicao = https.request({
    hostname: ip,
    port: 1516,
    path: '/',
    method: 'POST',

    headers: {
        Host: `${ip}:1516`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(corpo),
        Connection: 'close'
    },

    agent,
    timeout: 15000
}, resposta => {
    console.log('\nHTTPS ESTABELECIDO!');
    console.log('Status HTTP:', resposta.statusCode);
    console.log('Servidor:', resposta.headers.server || 'Não informado');
    console.log('TLS:', resposta.socket.getProtocol());

    let retorno = '';

    resposta.setEncoding('utf8');
    resposta.on('data', parte => retorno += parte);

    resposta.on('end', () => {
        console.log('Resposta da TV:', retorno || '(vazia)');
        console.log('\nTeste finalizado.');
        agent.destroy();
    });
});

requisicao.on('error', erro => {
    console.log('\nFALHA NA COMUNICAÇÃO!');
    console.log('Tipo:', erro.name);
    console.log('Detalhes:', erro.message);
    agent.destroy();
});

requisicao.on('timeout', () => {
    requisicao.destroy(new Error('Tempo esgotado.'));
});

requisicao.end(corpo);