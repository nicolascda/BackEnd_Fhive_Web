### BackEnd_Fhive_Web"

## Váriaveis que precisam estar no seu arquivo .env


```bash

DATABASE_URL="(link da sua url)"

JWT_SECRET="(gerado pelo terminal e colocado aqui)"

MQTT_BROKER_URL="(link de conexao ao local que você criou o seu broker)"
MQTT_USERNAME="(nome do usuário criado no local do seu broker)"
MQTT_PASSWORD="(senha do usuário criado no local do seu broker)"

DEVICE_ID="(você obtem o primeiro ao criar um dispositivo)"


```

## Descrição

O projeto se baseia no uso do BackEnd em conjunto com a framework do Prisma para conectar um banco de dados noSQL do mongoDB, usando essa relação para criar estrutura de dados flexíveis para os aparelhos IoT conectados ao sistema.

Sem contar que este projeto possui implementação com o Terraform, podendo testar em servidores da AWS e testar de forma local quanto para múltiplas pessoas


## Como rodar o sistema

Atualmente o projeto possui um sistema separado dentro do código para simular o ambiente do esp 32 caso você não tenha o aparelho disponível na vida real, então por causa disso é necessário realizar um passo a mais para testar o código

Primeiro usar o install tanto do npm tanto do prisma para pegar os dados e frameworks importantes.

```bash

npm i

npx prisma init

npx prisma generate

```

Depois usar os seguintes comandos, o node do dispostivo teste é somente necessário caso você queira criar esse aparelho virtual

```bash

npm run dev

node src/scripts/dispositivo-teste.js

```

Assim você inicia o servidor e no caso do node você manda uma sequência de dados para o backEnd que vai durar por 10 minutos, mas você pode aumentar o tempo máximo e quanto vale cada minuto no código.


## Extras

É necessário ficar atento sobre o uso e dado que dados do arquivo .env, pois eles são essências para o funcionamento do servidor, sem contar depois que você logar, é necessário salvar o token no bearer do thunder client(ou outro sistema, caso você use um diferente), para conseguir acessar os dados do dispositivo criado.