
import https from 'node:https';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const diretorio = path.dirname(fileURLToPath(import.meta.url));

const arquivoToken = path.join(
  diretorio,
  'samsung-tv-token.local.json'
);

// Aplicativos conhecidos pela interface Samsung IP Control.
// Os nomes são applicationName, não IDs numéricos.
const aplicativos = {
  youtube: 'youTube',
  netflix: 'netflix',
  prime: 'amazon',
  navegador: 'webBrowser',
  hulu: 'hulu',
  disney: 'disney+'
};

const comando = (process.argv[2] || '').toLowerCase();

async function carregarToken() {
  const conteudo = await readFile(arquivoToken, 'utf8');
  const dados = JSON.parse(conteudo);

  if (!dados.accessToken || !dados.ip) {
    throw new Error('Token ou IP não encontrado no arquivo.');
  }

  return dados;
}

function chamarSamsung(ip, token, metodo, parametros = {}) {
  return new Promise((resolve, reject) => {
    const corpo = JSON.stringify({
      jsonrpc: '2.0',
      id: String(Date.now()),
      method: metodo,
      params: {
        AccessToken: token,
        ...parametros
      }
    });

    const requisicao = https.request({
      hostname: ip,
      port: 1516,
      path: '/',
      method: 'POST',

      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(corpo)
      },

      // Mesmo procedimento utilizado no teste de controle.
      // Em produção, validar o certificado da TV.
      agent: new https.Agent({
        rejectUnauthorized: false
      }),

      timeout: 15000
    }, (resposta) => {
      let retorno = '';

      resposta.setEncoding('utf8');

      resposta.on('data', parte => {
        retorno += parte;
      });

      resposta.on('end', () => {
        let resultado;

        try {
          resultado = JSON.parse(retorno);
        } catch {
          reject(new Error(
            `Resposta inválida da TV: ${retorno.slice(0, 300)}`
          ));
          return;
        }

        if (resposta.statusCode < 200 ||
            resposta.statusCode >= 300) {
          reject(new Error(`Erro HTTP ${resposta.statusCode}`));
          return;
        }

        if (resultado.error || resultado.code !== undefined) {
          reject(new Error(
            resultado.error?.message ||
            resultado.message ||
            'A televisão recusou o comando.'
          ));
          return;
        }

        resolve(resultado.result ?? resultado);
      });
    });

    requisicao.on('timeout', () => {
      requisicao.destroy(
        new Error('Tempo esgotado aguardando a televisão.')
      );
    });

    requisicao.on('error', reject);

    requisicao.write(corpo);
    requisicao.end();
  });
}

async function abrirAplicativo(ip, token, nomeAplicativo) {
  const applicationName = aplicativos[nomeAplicativo];

  if (!applicationName) {
    throw new Error(
      `Aplicativo não cadastrado no teste: ${nomeAplicativo}`
    );
  }

  console.log(`\nAbrindo ${nomeAplicativo}...`);

  const resposta = await chamarSamsung(
    ip,
    token,
    'directAccessControl',
    { applicationName }
  );

  console.log('\nResposta da Samsung:');
  console.log(JSON.stringify(resposta, null, 2));

  console.log('\nSolicitação enviada.');
  console.log('Confira se o aplicativo abriu na televisão.');
}

async function trocarCanal(ip, token, direcao) {
  const control = direcao === 'mais'
    ? 'channelUp'
    : 'channelDn';

  console.log(
    direcao === 'mais'
      ? '\nAvançando um canal...'
      : '\nVoltando um canal...'
  );

  const resposta = await chamarSamsung(
    ip,
    token,
    'channelUpDnControl',
    { control }
  );

  console.log('\nResposta da Samsung:');
  console.log(JSON.stringify(resposta, null, 2));

  console.log('\nSolicitação de troca de canal enviada.');
}

async function executar() {
  console.log('================================');
  console.log(' FHIVE - TESTE DE APLICATIVOS');
  console.log('================================');

  const dados = await carregarToken();

  console.log(`Televisão: ${dados.ip}`);

  if (Object.hasOwn(aplicativos, comando)) {
    await abrirAplicativo(
      dados.ip,
      dados.accessToken,
      comando
    );
    return;
  }

  if (comando === 'canal+') {
    await trocarCanal(dados.ip, dados.accessToken, 'mais');
    return;
  }

  if (comando === 'canal-') {
    await trocarCanal(dados.ip, dados.accessToken, 'menos');
    return;
  }

  throw new Error(
    'Comando inválido. Use youtube, netflix, prime, navegador, hulu, canal+ ou canal-.'
  );
}

executar().catch(erro => {
  console.error('\nERRO:', erro.message);
  process.exitCode = 1;
});
