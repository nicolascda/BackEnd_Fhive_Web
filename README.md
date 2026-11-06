# FHIVE — Backend

API REST responsável pela camada de serviços do **FHIVE**, conectando a aplicação web e os dispositivos IoT a um banco de dados MongoDB. O backend concentra autenticação, gerenciamento de usuários, equipes, integrantes, cargos, dispositivos, rotinas e armazenamento de telemetrias recebidas por MQTT.

---

## Sumário

- [Visão geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Arquitetura do projeto](#arquitetura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Configuração do ambiente](#configuração-do-ambiente)
- [Instalação e execução](#instalação-e-execução)
- [Banco de dados e Prisma](#banco-de-dados-e-prisma)
- [Autenticação](#autenticação)
- [Documentação da API](#documentação-da-api)
- [Integração MQTT e IoT](#integração-mqtt-e-iot)
- [Modelo de dados](#modelo-de-dados)
- [Tratamento de erros](#tratamento-de-erros)
- [Segurança](#segurança)
- [Solução de problemas](#solução-de-problemas)

---

## Visão geral

O FHIVE é uma plataforma voltada ao gerenciamento de ambientes, equipes e dispositivos conectados. Este repositório contém o backend desenvolvido em Node.js e Express, com persistência em MongoDB por meio do Prisma ORM.

A aplicação disponibiliza endpoints HTTP para o frontend e mantém uma integração MQTT opcional para receber dados enviados por dispositivos. Quando o broker MQTT não está configurado ou está indisponível, o servidor HTTP pode continuar funcionando normalmente.

**Base local padrão:** `http://localhost:3000`

> As rotas são utilizadas diretamente, sem o prefixo `/api`.

## Funcionalidades

- Cadastro de usuários com confirmação de e-mail por código.
- Login com geração de token JWT.
- Consulta e atualização do perfil do usuário.
- Recuperação e redefinição de senha por código enviado por e-mail.
- Cadastro e consulta de dispositivos vinculados ao usuário autenticado.
- Consulta de telemetrias armazenadas para cada dispositivo.
- Criação, consulta, edição e exclusão de rotinas individuais.
- Criação e gerenciamento de equipes, incluindo código de convite e limite de integrantes.
- Entrada em equipes por código.
- Gerenciamento individual de integrantes e seus cargos.
- Criação, consulta e exclusão de cargos personalizados com permissões.
- Rotinas vinculadas a equipes.
- Recebimento e processamento de telemetrias por MQTT.
- Script para simular o envio de telemetria de um dispositivo.

## Tecnologias

| Tecnologia | Utilização |
|---|---|
| Node.js | Ambiente de execução JavaScript |
| Express 5 | Servidor HTTP e definição das rotas REST |
| MongoDB | Banco de dados NoSQL |
| Prisma ORM 6 | Modelagem e acesso ao banco de dados |
| JSON Web Token (JWT) | Autenticação das requisições |
| bcrypt | Hash e verificação de senhas |
| Nodemailer | Envio de códigos por e-mail via SMTP |
| MQTT.js | Comunicação com o broker MQTT |
| dotenv | Carregamento das variáveis de ambiente |
| CORS | Configuração de acesso entre origens |
| Nodemon | Reinicialização automática durante o desenvolvimento |

## Arquitetura do projeto

```text
BackEnd_Fhive_Web/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── controllers/
│   │   ├── cargo.controller.js
│   │   ├── configurador.controller.js
│   │   ├── dispositivo.controller.js
│   │   ├── equipe.controller.js
│   │   ├── equipeIntegrante.controller.js
│   │   ├── rotina.controller.js
│   │   └── usuario.controller.js
│   ├── data/
│   │   └── prisma.js
│   ├── middlewares/
│   │   └── authMiddleware.js
│   ├── routes/
│   │   ├── cargo.route.js
│   │   ├── configurador.route.js
│   │   ├── dispositivo.route.js
│   │   ├── equipe.route.js
│   │   ├── equipeIntegrante.route.js
│   │   ├── rotina.route.js
│   │   └── usuario.route.js
│   ├── scripts/
│   │   ├── dispositivo-teste.js
│   │   └── teste.js
│   └── services/
│       ├── codigo.service.js
│       ├── email.service.js
│       ├── equipe.service.js
│       └── mqtt.service.js
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── prisma.config.ts
├── server.js
└── README.md
```

### Responsabilidade das pastas

- **`controllers/`**: implementa a lógica das operações solicitadas pelas rotas e monta as respostas HTTP.
- **`routes/`**: registra os caminhos e associa cada endpoint ao respectivo controller e middleware.
- **`middlewares/`**: contém funções executadas antes dos controllers, como a validação do token JWT.
- **`services/`**: concentra funcionalidades reutilizáveis, como envio de e-mails, códigos temporários, regras de equipes e comunicação MQTT.
- **`data/`**: instancia e disponibiliza o cliente Prisma.
- **`scripts/`**: contém scripts auxiliares, incluindo a simulação de um dispositivo IoT.
- **`prisma/`**: contém o schema que define os modelos e relacionamentos do banco de dados.

## Pré-requisitos

Antes de iniciar, tenha instalado:

- Node.js **18.18 ou superior**;
- npm;
- uma instância MongoDB acessível (por exemplo, MongoDB Atlas ou MongoDB local);
- uma conta ou servidor SMTP para envio dos e-mails de confirmação e recuperação de senha;
- um broker MQTT compatível, caso queira utilizar a integração com dispositivos IoT.

O MongoDB e o SMTP são necessários para os fluxos que dependem de persistência e envio de e-mail. O MQTT é opcional para iniciar o servidor HTTP.

## Configuração do ambiente

Na raiz do projeto, crie um arquivo chamado `.env`. Utilize o arquivo `.env.example` como referência:

```env
# Aplicação
PORT=3000
JWT_SECRET=coloque_uma_chave_secreta_forte_aqui

# MongoDB
DATABASE_URL="mongodb+srv://USUARIO:SENHA@CLUSTER/NOME_DO_BANCO?retryWrites=true&w=majority"

# SMTP — confirmação de cadastro e recuperação de senha
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=seu-email@dominio.com
SMTP_PASS=sua-senha-de-aplicativo
SMTP_FROM="FHIVE <seu-email@dominio.com>"

# MQTT — opcional; necessário para iniciar a conexão com o broker
MQTT_BROKER_URL=mqtts://seu-broker:8883
MQTT_USERNAME=seu-usuario
MQTT_PASSWORD=sua-senha

# Simulador de dispositivo — utilizado por src/scripts/dispositivo-teste.js
DEVICE_ID=ID_DO_DISPOSITIVO_CADASTRADO
```

### Variáveis de ambiente

| Variável | Obrigatória | Finalidade |
|---|---|---|
| `PORT` | Não | Porta HTTP. Padrão: `3000`. |
| `JWT_SECRET` | Sim | Chave usada para assinar e validar tokens JWT. |
| `DATABASE_URL` | Sim | String de conexão com o MongoDB. |
| `SMTP_HOST` | Para envio de e-mail | Servidor SMTP. |
| `SMTP_PORT` | Para envio de e-mail | Porta do servidor SMTP. |
| `SMTP_SECURE` | Para envio de e-mail | `true` para conexão TLS direta; `false` para conexão sem TLS direto, conforme o provedor. |
| `SMTP_USER` | Para envio de e-mail | Usuário de autenticação SMTP. |
| `SMTP_PASS` | Para envio de e-mail | Senha ou senha de aplicativo SMTP. |
| `SMTP_FROM` | Para envio de e-mail | Remetente exibido nas mensagens. |
| `MQTT_BROKER_URL` | Não | Endereço do broker MQTT. |
| `MQTT_USERNAME` | Não | Usuário do broker MQTT. |
| `MQTT_PASSWORD` | Não | Senha do broker MQTT. |
| `DEVICE_ID` | Apenas para o simulador | Identificador do dispositivo que publicará os dados de teste. |

O MQTT só é iniciado pelo `server.js` quando `MQTT_BROKER_URL`, `MQTT_USERNAME` e `MQTT_PASSWORD` estão preenchidos. Se essas três variáveis não estiverem configuradas, a inicialização MQTT é ignorada.

> **Importante:** nunca versione ou compartilhe o arquivo `.env`. O repositório já ignora esse arquivo por meio do `.gitignore`.

## Instalação e execução

### 1. Acesse a pasta do backend

```bash
cd BackEnd_Fhive_Web
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie o arquivo `.env` e preencha os dados de conexão do MongoDB e o `JWT_SECRET`. Configure as variáveis SMTP para habilitar cadastro e recuperação de senha por e-mail.

### 4. Gere o Prisma Client

```bash
npx prisma generate
```

### 5. Sincronize o schema com o MongoDB

Quando estiver configurando o banco pela primeira vez ou após alterações no `schema.prisma`, execute:

```bash
npx prisma db push
```

O projeto utiliza MongoDB. Nesse fluxo, `db push` aplica a estrutura do schema ao banco; não utilize `prisma migrate` como se o datasource fosse PostgreSQL ou MySQL.

### 6. Inicie o servidor em desenvolvimento

```bash
npm run dev
```

Saída esperada:

```text
Servidor rodando na http://localhost:3000
```

Se as variáveis MQTT estiverem configuradas, o backend também tentará conectar-se ao broker. A conexão MQTT é independente do servidor HTTP.

### 7. Verifique se a API está ativa

Faça uma requisição `GET` para:

```http
http://localhost:3000/
```

Resposta esperada:

```json
{
  "mensagem": "Backend funcionando."
}
```

### Execução sem Nodemon

Para iniciar diretamente com Node.js:

```bash
node server.js
```

## Banco de dados e Prisma

O projeto utiliza MongoDB com o Prisma Client. A conexão é configurada pela variável `DATABASE_URL` e o schema está em `prisma/schema.prisma`.

Para regenerar o cliente após mudanças no schema:

```bash
npx prisma generate
```

Para sincronizar as alterações com o banco MongoDB:

```bash
npx prisma db push
```

### Modelos principais

| Modelo | Responsabilidade |
|---|---|
| `Usuarios` | Dados de cadastro, credenciais e perfil dos usuários. |
| `Dispositivos` | Equipamentos IoT registrados e vinculados a um usuário. |
| `Telemetrias` | Leituras e valores de consumo recebidos dos dispositivos. |
| `Rotinas` | Rotinas individuais ou associadas a uma equipe. |
| `ExecucoesRotina` | Registros de execução de ações de uma rotina. |
| `Equipes` | Dados, configurações, plano e código de convite da equipe. |
| `EquipeIntegrantes` | Vínculo entre usuário e equipe, incluindo o cargo atribuído. |
| `CargosEquipe` | Cargos, cores, descrições e permissões de cada equipe. |

Os identificadores dos documentos MongoDB são representados no Prisma por campos `String` mapeados para `_id` com `@db.ObjectId`.

## Autenticação

As rotas protegidas utilizam JSON Web Token. O token é gerado no login e tem validade de **7 dias**.

Envie o token no cabeçalho `Authorization`:

```http
Authorization: Bearer SEU_TOKEN_JWT
```

Exemplo com `curl`:

```bash
curl http://localhost:3000/usuarios/perfil \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

Sem token, com formato incorreto ou com token expirado, o middleware responde com HTTP `401`.

### Fluxo de cadastro

1. Envie `nome`, `email` e `senha` para `POST /usuarios`.
2. O backend envia um código de confirmação para o e-mail informado.
3. Envie `email` e `codigo` para `POST /usuarios/confirmarEmail`.
4. Após a confirmação, o usuário é criado no MongoDB.

O código de confirmação do cadastro expira em **10 minutos**.

### Fluxo de recuperação de senha

1. `POST /usuarios/esqueci-senha`: solicita o envio de um código ao e-mail.
2. `POST /usuarios/verificar-codigo-recuperacao`: verifica o código recebido.
3. `POST /usuarios/redefinir-senha`: redefine a senha com `email`, `codigo` e `novaSenha`.

O código de recuperação expira em **1 hora**. O serviço limita a cinco tentativas incorretas por código.

## Documentação da API

**URL base local:** `http://localhost:3000`

Os endpoints abaixo correspondem às rotas registradas atualmente em `src/app.js` e nos arquivos de `src/routes/`. Os caminhos não utilizam o prefixo `/api`.

### Convenções

- **Autenticação:** `Sim` significa que a requisição deve conter `Authorization: Bearer <token>`.
- **`:id`:** identificador do recurso no MongoDB (ObjectId), exceto quando indicado de outra forma.
- **`:equipeId`:** identificador da equipe.
- **`:integranteId`:** identificador do vínculo do integrante com a equipe, não o ID do usuário.
- **`:cargoId`:** identificador do cargo.

### Saúde da API

| Método | Endpoint | Autenticação |
|---|---|---|
| `GET` | `/` | Não |

### Usuários e autenticação

| Método | Endpoint | Autenticação |
|---|---|---|
| `POST` | `/usuarios` | Não |
| `POST` | `/usuarios/confirmarEmail` | Não |
| `POST` | `/usuarios/login` | Não |
| `GET` | `/usuarios` | Sim |
| `GET` | `/usuarios/perfil` | Sim |
| `PATCH` | `/usuarios/perfil` | Sim |
| `POST` | `/usuarios/esqueci-senha` | Não |
| `POST` | `/usuarios/verificar-codigo-recuperacao` | Não |
| `POST` | `/usuarios/redefinir-senha` | Não |

### Dispositivos e telemetrias

| Método | Endpoint | Autenticação |
|---|---|---|
| `POST` | `/dispositivos` | Sim |
| `GET` | `/dispositivos` | Sim |
| `GET` | `/dispositivos/:id` | Sim |
| `GET` | `/dispositivos/:id/telemetrias` | Sim |

> O controller atual disponibiliza criação e consulta de dispositivos e telemetrias. Não há endpoints de atualização ou exclusão de dispositivos neste conjunto de rotas.

### Rotinas individuais

| Método | Endpoint | Autenticação |
|---|---|---|
| `POST` | `/rotinas` | Sim |
| `GET` | `/rotinas` | Sim |
| `GET` | `/rotinas/:id` | Sim |
| `PUT` | `/rotinas/:id` | Sim |
| `DELETE` | `/rotinas/:id` | Sim |

### Equipes

| Método | Endpoint | Autenticação |
|---|---|---|
| `POST` | `/equipes` | Sim |
| `GET` | `/equipes` | Sim |
| `GET` | `/equipes/:id` | Sim |
| `PATCH` | `/equipes/:id` | Sim |
| `DELETE` | `/equipes/:id` | Sim |

### Rotinas de equipe

| Método | Endpoint | Autenticação |
|---|---|---|
| `GET` | `/equipes/:equipeId/rotinas` | Sim |
| `POST` | `/equipes/:equipeId/rotinas` | Sim |
| `PUT` | `/equipes/:equipeId/rotinas/:id` | Sim |
| `DELETE` | `/equipes/:equipeId/rotinas/:id` | Sim |

### Integrantes de equipe

| Método | Endpoint | Autenticação |
|---|---|---|
| `POST` | `/equipes/entrar` | Sim |
| `GET` | `/equipes/:id/integrantes` | Sim |
| `PATCH` | `/equipes/:id/integrantes/:integranteId/cargo` | Sim |
| `DELETE` | `/equipes/:id/integrantes/:integranteId` | Sim |

### Cargos de equipe

| Método | Endpoint | Autenticação |
|---|---|---|
| `GET` | `/equipes/:id/cargos` | Sim |
| `POST` | `/equipes/:id/cargos` | Sim |
| `DELETE` | `/equipes/:id/cargos/:cargoId` | Sim |

### Exemplos de requisição

Os exemplos usam JSON e consideram o servidor em `localhost:3000`.

#### Login

```http
POST /usuarios/login
Content-Type: application/json
```

```json
{
  "email": "usuario@exemplo.com",
  "senha": "sua-senha"
}
```

A resposta bem-sucedida contém `token` e os dados básicos do usuário. Utilize o token nas demais rotas protegidas.

#### Cadastro de dispositivo

```http
POST /dispositivos
Authorization: Bearer SEU_TOKEN_JWT
Content-Type: application/json
```

```json
{
  "nome": "Motor principal",
  "tipo": "Motor"
}
```

O backend gera o `deviceId` do dispositivo e o retorna na resposta. Esse identificador é utilizado na publicação MQTT.

#### Criação de equipe

```http
POST /equipes
Authorization: Bearer SEU_TOKEN_JWT
Content-Type: application/json
```

```json
{
  "nome": "Equipe de Produção",
  "descricao": "Equipe responsável pelo ambiente industrial.",
  "plano": "Básico",
  "setor": "Industrial",
  "limiteIntegrantes": 10
}
```

Setores aceitos: `Industrial`, `Educação`, `Saúde` e `Outros`. No código atual, o plano disponível é `Básico`, com limite máximo de 30 integrantes. O limite deve estar entre 5 e 30 e ser múltiplo de 5. O líder é incluído automaticamente.

#### Entrada em equipe por código

```http
POST /equipes/entrar
Authorization: Bearer SEU_TOKEN_JWT
Content-Type: application/json
```

```json
{
  "codigo": "A1B2C3D4"
}
```

O código de convite é gerado pela equipe. A entrada é recusada quando o usuário já pertence à equipe ou quando o limite de integrantes foi atingido.

#### Criação de cargo personalizado

```http
POST /equipes/ID_DA_EQUIPE/cargos
Authorization: Bearer SEU_TOKEN_JWT
Content-Type: application/json
```

```json
{
  "nome": "Supervisor",
  "descricao": "Acompanha as atividades da equipe.",
  "cor": "#3975A8",
  "permissoes": {
    "visualizarAmbiente": true,
    "visualizarDados": true,
    "gerenciarMaquinas": false,
    "gerenciarRotinas": true,
    "executarAcoes": true,
    "gerenciarIntegrantes": false,
    "gerenciarCargos": false,
    "configurarEquipe": false
  }
}
```

As permissões reconhecidas são `visualizarAmbiente`, `visualizarDados`, `gerenciarMaquinas`, `gerenciarRotinas`, `executarAcoes`, `gerenciarIntegrantes`, `gerenciarCargos` e `configurarEquipe`. O acesso às operações é validado no backend conforme o cargo do integrante.

#### Criação de rotina individual

```http
POST /rotinas
Authorization: Bearer SEU_TOKEN_JWT
Content-Type: application/json
```

```json
{
  "nome": "Rotina de abertura",
  "descricao": "Liga o equipamento no início do expediente.",
  "horarioInicial": "08:00",
  "horarioFinal": "09:00",
  "diasSemana": {
    "segunda": true,
    "terca": true,
    "quarta": true,
    "quinta": true,
    "sexta": true,
    "sabado": false,
    "domingo": false
  },
  "acoes": [
    {
      "ordem": 1,
      "horario": "08:05",
      "tipo": "ligar",
      "instrucoes": {}
    }
  ],
  "dispositivoId": "fhive-ID_DO_DISPOSITIVO"
}
```

O campo `dispositivoId` recebe o identificador público `deviceId` gerado pelo cadastro do dispositivo. Os tipos de ação aceitos são `ligar`, `alterar_estado` e `desligar`. Os horários devem seguir o formato `HH:mm`.

#### Criação de rotina de equipe

```http
POST /equipes/ID_DA_EQUIPE/rotinas
Authorization: Bearer SEU_TOKEN_JWT
Content-Type: application/json
```

```json
{
  "nome": "Inspeção diária",
  "descricao": "Sequência de inspeção dos equipamentos.",
  "horarioInicial": "08:00",
  "horarioFinal": "09:00",
  "diasSemana": ["Seg", "Ter", "Qua", "Qui", "Sex"],
  "acoes": [
    {
      "id": "acao-1",
      "horario": "08:10",
      "nome": "Verificar equipamento",
      "descricao": "Conferir o estado do equipamento."
    }
  ]
}
```

As rotinas de equipe utilizam um formato próprio: `diasSemana` é uma lista com abreviações (`Seg`, `Ter`, `Qua`, `Qui`, `Sex`, `Sáb`, `Dom`) e cada ação contém `id`, `horario`, `nome` e `descricao`.

## Integração MQTT e IoT

A integração MQTT permite que dispositivos publiquem leituras de telemetria sem realizar login HTTP. O backend conecta-se ao broker com as variáveis `MQTT_BROKER_URL`, `MQTT_USERNAME` e `MQTT_PASSWORD`.

### Tópico de publicação

Cada dispositivo deve publicar no tópico:

```text
fhive/devices/ID_DO_DISPOSITIVO/telemetry
```

O backend assina o padrão:

```text
fhive/devices/+/telemetry
```

Substitua `ID_DO_DISPOSITIVO` pelo `deviceId` retornado ao cadastrar o dispositivo pela API.

### Exemplo de payload MQTT

```json
{
  "minuto": 1,
  "leitura_id": "identificador-unico-da-leitura",
  "sessao_id": "identificador-da-sessao",
  "power_w": 180.5,
  "energy_wh": 3.0083,
  "voltage": 220,
  "current": 0.82
}
```

Os campos `sessao_id`, `leitura_id` e `energy_wh` são necessários para o processamento da mensagem. `leitura_id` evita que a mesma leitura seja gravada duas vezes na sessão. O campo `energy_wh` é utilizado para calcular os valores de consumo.

As leituras são associadas ao dispositivo correspondente e armazenadas em `Telemetrias`. O backend atualiza o estado do dispositivo e o horário da última comunicação (`lastSeenAt`). As sessões são finalizadas ao atingir dez leituras processadas.

### Simulador de dispositivo

O projeto contém o script `src/scripts/dispositivo-teste.js`, que publica dados simulados pelo MQTT. Para utilizá-lo:

1. Cadastre um dispositivo pela API.
2. Copie o `deviceId` retornado.
3. Configure o broker MQTT no `.env`.
4. Informe o `deviceId` na variável `DEVICE_ID` do `.env`.
5. Execute:

```bash
node src/scripts/dispositivo-teste.js
```

O simulador publica dez leituras, com intervalo de dez segundos entre elas, e encerra a conexão ao terminar.

## Tratamento de erros

A API utiliza códigos HTTP para indicar o resultado das operações. Entre os mais comuns estão:

| Código | Significado |
|---|---|
| `200` | Requisição processada com sucesso. |
| `201` | Recurso criado com sucesso. |
| `400` | Dados ausentes ou inválidos. |
| `401` | Token ausente, inválido ou expirado. |
| `403` | Usuário autenticado sem permissão para a operação. |
| `404` | Recurso não encontrado ou não acessível pelo usuário. |
| `409` | Conflito, como e-mail já cadastrado ou recurso duplicado. |
| `413` | Conteúdo enviado acima do limite aceito pelo endpoint. |
| `500` | Erro interno durante o processamento. |

As respostas de erro normalmente retornam um JSON com a propriedade `mensagem` ou `erro`, conforme o controller responsável.

## Segurança

- Mantenha `.env` fora do controle de versão e não envie credenciais em issues, commits ou arquivos públicos.
- Utilize um `JWT_SECRET` longo, aleatório e exclusivo para cada ambiente.
- Utilize senhas de aplicativo ou credenciais específicas para SMTP, conforme o provedor.
- Restrinja as permissões do usuário do MongoDB ao banco utilizado pela aplicação.
- Em produção, configure o CORS para aceitar somente as origens necessárias. A configuração atual utiliza `cors()` sem restrição explícita de origem.
- Utilize TLS nas conexões externas com MongoDB, SMTP e MQTT quando disponibilizado pelo provedor.
- Não compartilhe tokens JWT em capturas de tela, logs ou repositórios.

## Solução de problemas

### Erro de conexão com MongoDB

1. Confira se `DATABASE_URL` está preenchida corretamente.
2. Verifique usuário, senha, nome do banco e parâmetros da URL.
3. Se estiver utilizando MongoDB Atlas, confira as regras de acesso de rede e a liberação do IP da máquina.
4. Execute novamente `npx prisma generate` após instalar as dependências ou alterar a configuração do Prisma.

### Erro ao enviar e-mail

1. Confira `SMTP_HOST`, `SMTP_PORT` e `SMTP_SECURE` com os dados do provedor.
2. Verifique `SMTP_USER` e `SMTP_PASS`.
3. Para provedores que exigem autenticação adicional, utilize uma senha de aplicativo quando aplicável.
4. Confira se `SMTP_FROM` utiliza um remetente permitido pelo provedor.

### Erro de autenticação nas rotas

1. Realize o login em `POST /usuarios/login`.
2. Copie o campo `token` da resposta.
3. Envie `Authorization: Bearer <token>` na requisição.
4. Faça login novamente caso o token tenha expirado.

### MQTT não conecta

1. Confira as três variáveis `MQTT_BROKER_URL`, `MQTT_USERNAME` e `MQTT_PASSWORD`.
2. Verifique endereço, porta, protocolo (`mqtt://` ou `mqtts://`) e credenciais do broker.
3. Confira se o broker está acessível e se o usuário tem permissão de publicação/assinatura no tópico utilizado.
4. Verifique se o tópico e o `deviceId` correspondem ao dispositivo cadastrado.

Se o MQTT estiver indisponível, o servidor HTTP foi implementado para continuar funcionando.

---

## Observações sobre o estado atual do projeto

- As rotas documentadas refletem os arquivos presentes neste repositório; endpoints podem ser adicionados ou modificados em versões futuras.
- O gerenciamento de dispositivos atualmente disponibiliza cadastro e consulta, mas não possui rotas HTTP de atualização e exclusão.
- O gerenciamento de cargos atualmente disponibiliza listagem, criação e exclusão; não há rota de edição de cargo neste conjunto.
- Os códigos temporários de cadastro e recuperação ficam em memória no processo Node.js. Se o servidor for reiniciado, os códigos pendentes deixam de existir.
- O arquivo `server.js` inicia a API HTTP e, quando configurado, inicia a conexão MQTT.

---

**FHIVE — Backend**  
API REST • Node.js • Express • Prisma • MongoDB • MQTT