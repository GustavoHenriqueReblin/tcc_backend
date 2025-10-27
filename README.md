# TCC Backend

Sistema de controle de produção e estoque de sucos, com acompanhamento de custos e vendas, voltado para pequenas agroindústrias.

Este repositório contém a API (Node.js + TypeScript + Express) com autenticação via JWT em cookie HttpOnly, persistência com Prisma (MariaDB/MySQL) e rotinas agendadas para atualização de dados geográficos (IBGE).

---

## Sumário
- Sobre o projeto
- Tecnologias
- Estrutura do projeto
- Variáveis de ambiente
- Scripts disponíveis
- Como rodar localmente
- Endpoints principais
- Autenticação e segurança
- Tarefas agendadas (CRON)
- Logs e tratamento de erros
- Notas e boas práticas

---

## Sobre o projeto
- API REST em Node.js responsável por gerenciar empresas, pessoas e usuários, com autenticação e controle de acesso por papel.
- Banco de dados relacional (MariaDB/MySQL) gerenciado via Prisma, com migrações versionadas.
- Rotina agendada para popular/atualizar País/Estados/Cidades via API do IBGE.

## Tecnologias
- Runtime/linguagem: Node.js, TypeScript
- Web: Express 5, CORS, cookie-parser
- ORM/migrações: Prisma (`provider = mysql`) com MariaDB
- Banco: MariaDB (driver `mariadb`)
- Auth: JWT (`jsonwebtoken`), `bcrypt`
- Validação/config: `zod`, `dotenv`
- Tarefas agendadas: `node-cron`
- HTTP client: `axios`
- Qualidade: ESLint + Prettier

## Estrutura do projeto
- `src/app.ts`: configura Express, middlewares, rotas e error handler
- `src/server.ts`: inicializa o servidor e agenda o CRON
- `src/config/`
  - `env.ts`: carrega e valida variáveis de ambiente (Zod)
  - `db.ts`: pool de conexão MariaDB e teste de conectividade
  - `prisma.ts`: instancia do `PrismaClient`
- `src/controllers/`: recebe `Request/Response` e delega para serviços
- `src/services/`: regra de negócio e acesso ao Prisma (`BaseService` com `safeQuery`)
- `src/routes/`: define endpoints e aplica middlewares
- `src/middleware/`
  - `authMiddleware.ts`: valida cookie JWT e token persistido
  - `errorHandler.ts`: captura erros e registra em banco
- `src/utils/`
  - `functions.ts`: helpers (ex.: `sendResponse`, `parseTimeToMs`)
  - `errorBundler.ts`: normalização e persistência de erros (`Log`)
- `src/cron/updateGeoData.ts`: rotina para sincronizar País/Estados/Cidades (IBGE)
- `prisma/schema.prisma`: schema do banco (Country, State, City, Enterprise, Person, User, Token, Log + enums)
- `prisma/seed.ts`: dados iniciais (empresa, pessoa, usuário) e carga IBGE
- `nodemon.json`: execução TS em dev com `ts-node` e `tsconfig-paths`

Aliases TS (ver `tsconfig.json`): `@config/*`, `@cron/*`, `@utils/*`, `@middleware/*`, `@controllers/*`, `@routes/*`, `@services/*`.

## Variáveis de ambiente
Arquivo `.env` (veja `.env.example`):
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`: dados de acesso ao MariaDB
- `PORT`: porta do servidor (ex.: `3000`)
- `DATABASE_URL`: string de conexão para Prisma, ex.: `mysql://USER:PASS@HOST:3306/DB_NAME`
- `ENVIRONMENT`: `DEVELOPMENT` ou `PRODUCTION` (controla verbosidade e alguns logs)
- `APP_SECRET`: segredo do app (mín. 10 chars). Usado para assinar JWT e como “sal adicional” no hash de senha
- `JWT_EXPIRES_IN`: duração do JWT (ex.: `2d`, `12h`, `30m`)

Observações:
- O schema do Prisma usa `provider = "mysql"` e funciona com MariaDB.
- O `env.ts` valida os valores e encerra a aplicação caso estejam inválidos.

## Scripts disponíveis
- `npm run dev`: inicia servidor em desenvolvimento (`ts-node` via `nodemon`)
- `npm run build`: compila TypeScript para `dist/`
- `npm start`: roda `node dist/server.js`
- `npm run lint` / `npm run lint:fix`: análise estática com ESLint
- `npm run prisma:validate`: valida o schema Prisma
- `npm run prisma:migrate`: cria/aplica migração de desenvolvimento
- `npm run prisma:generate`: gera o client do Prisma
- `npm run prisma:seed`: executa a seed (inclui usuário e dados IBGE)
- `npm run prisma:reset`: reseta o banco (cuidado, ambiente de dev)

## Como rodar localmente
Pré-requisitos: Node.js (>= 18 recomendado), MariaDB em execução e acessível.

1) Instale dependências
   - `npm install`

2) Configure o `.env`
   - Copie `.env.example` para `.env` e preencha os valores
   - Exemplo `DATABASE_URL`: `mysql://root:root@localhost:3306/tcc_db`

3) Gere o client do Prisma
   - `npm run prisma:generate`

4) Crie/aplique migrações e dados iniciais
   - `npm run prisma:migrate`
   - `npm run prisma:seed`

5) Rode a API
   - Desenvolvimento: `npm run dev`
   - Produção: `npm run build` e depois `npm start`

Ao subir, o app testa a conexão com o MariaDB e loga “Conexão com o MariaDB estabelecida!” caso sucesso.

## Endpoints principais
Base: `/api/v1`

- Auth
  - `POST /auth/login`
    - Body: `{ "username": "gustavo", "password": "123456" }`
    - Sucesso: define cookie `token` (HttpOnly, `SameSite=Strict`) e retorna dados do usuário (sem o token no body)

- Usuários (protegidos por `authMiddleware` – requer cookie válido)
  - `GET /users`: lista usuários (com `person` e `enterprise`)
  - `POST /users`: cria usuário. Campos esperados: `username`, `password`, `personId`, `enterpriseId`

Observação: as rotas são montadas em `src/routes/*.routes.ts` e agrupadas em `src/routes/index.routes.ts`.

## Autenticação e segurança
- Login gera JWT assinado com `APP_SECRET` e persiste o token na tabela `Token` com `expiresAt` e flag `valid`.
- O middleware `authMiddleware` valida:
  - Presença do cookie `token`
  - Assinatura/expiração do JWT
  - Se o token existe/está válido no banco e não expirou
- Cookies
  - Marcado como `HttpOnly`, `SameSite=Strict` e `secure: true`
  - Importante: `secure: true` exige HTTPS para que navegadores armazenem o cookie. Em desenvolvimento, se testar via browser sem HTTPS, o cookie pode não ser salvo. Soluções:
    - Usar um proxy local com HTTPS; ou
    - Testar com ferramentas que respeitam cookies manualmente (ex.: Postman com cookie jar); ou
    - Ajustar temporariamente `secure: false` em `src/controllers/auth.controller.ts` SOMENTE em ambiente local.

## Tarefas agendadas (CRON)
- Arquivo: `src/cron/updateGeoData.ts`
- Agendamento: todo domingo às 03:00 (America/Sao_Paulo)
- O que faz: sincroniza País (`Country`), Estados (`State`) e Cidades (`City`) usando a API do IBGE
- Também é executável manualmente via a seed (para popular dados na primeira execução)

## Logs e tratamento de erros
- `errorHandler` captura erros das rotas e chama `handleError`, que:
  - Normaliza o erro, escreve no console (em `DEVELOPMENT`) e persiste na tabela `Log`
  - Salva `message`, `stack`, `context` (ex.: `ROUTE:GET /api/v1/users`) e `enterpriseId` (quando disponível)
- `BaseService.safeQuery` encapsula operações com Prisma e também registra falhas com contexto, evitando queda da API

## Notas e boas práticas
- Senhas são armazenadas com `bcrypt`. No login, compara-se `hash(APP_SECRET + password)` – portanto o `APP_SECRET` é crítico.
- Use `ENVIRONMENT=PRODUCTION` em produção para reduzir logs e evitar prints sensíveis.
- Revogue tokens ajustando o campo `valid=false` ou apagando registros na tabela `Token`.
- Os aliases de caminho (ex.: `@services/*`) requerem execução via `ts-node` com `tsconfig-paths` (já configurado no `nodemon.json`).

---

## Licença
©2025 Gustavo Henrique Reblin. Todos os direitos reservados.

Este software é de propriedade exclusiva do autor.
Nenhuma parte deste código, documentação ou conteúdo poderá ser copiada, modificada, distribuída ou utilizada, total ou parcialmente, sem autorização expressa e por escrito do detentor dos direitos.

O uso deste sistema é restrito aos fins autorizados pelo proprietário.
O descumprimento destas condições poderá resultar em sanções civis e penais conforme a legislação aplicável.
