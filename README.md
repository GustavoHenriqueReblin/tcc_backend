# TCC Backend

API para gestão de produção e estoque de sucos em pequenas agroindústrias, cobrindo cadastros, produção, vendas, compras e finanças com rastreio por lotes.

## Visão geral
- Node.js + TypeScript + Express 5, Prisma (MariaDB/MySQL) e autenticacao via JWT em cookie HttpOnly.
- Validação de ambiente com Zod e CORS configurado para origem segura.
- Rotina CRON para sincronizar País/Estado/Cidade com a API do IBGE.
- Seeds com dados iniciais (empresa, pessoa, usuário) e carga geográfica.

## Principais módulos
- Cadastros base: Country/State/City, Enterprise, Person, User com papéis (Employee/Manager/Owner) e tokens persistidos.
- Catálogo e estoque: definições de produto, unidade, produtos, inventário, depósitos, lotes e movimentações IN/OUT com origem (compra, colheita, produção, ajuste, venda).
- produção: receitas e itens, ordens de produção com insumos, custos e vínculos a lotes/depósitos.
- Pedidos e relacionamento: clientes/endereços de entrega, fornecedores, pedidos de venda e compra com itens e status.
- Financeiro: contas a receber/pagar, transações financeiras e métodos de pagamento.
- Patrimônio e controle: ativos, categorias, manutencao; logs técnicos e auditoria de ações.

## Arquitetura
- `src/app.ts`: instancia Express, CORS, cookies, JSON, rotas e `errorHandler`; testa conexão com o banco.
- `src/server.ts`: sobe o servidor e inicia o CRON `startGeoDataCron`.
- `src/routes/*`: definição dos endpoints e middlewares; controladores em `src/controllers/*` chamam servicos em `src/services/*`.
- `src/middleware/`: `authMiddleware` valida cookie JWT e token no banco; `errorHandler` normaliza e persiste erros.
- `src/utils/`: utilidades (`sendResponse`, conversao de tempo, bundler de erros).
- `prisma/schema.prisma`: modelo completo de domínio (cadastros, estoque, produção, pedidos, financeiro, patrimônio).
- `prisma/seed.ts`: popula IBGE e cria registros iniciais.

## Ambiente
Variáveis esperadas (`.env`, ver `.env.example`):
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `DATABASE_URL`
- `PORT`, `CLIENT_URL`, `ENVIRONMENT`
- `APP_SECRET` (min. 10 chars) e `JWT_EXPIRES_IN`

## Scripts
- `npm run dev` / `npm start` / `npm run build`
- `npm run lint` / `npm run lint:fix`
- `npm run prisma:generate` / `prisma:validate` / `prisma:migrate` / `prisma:seed` / `prisma:reset` / `prisma:migrate:deploy`
- `npm test`: roda seed e testes Playwright.

## Agendamentos e dados
- CRON: `src/cron/updateGeoData.ts`, domingo 03:00 (America/Sao_Paulo), sincroniza País/Estado/Cidade via IBGE.
- Seed pode ser executada para popular geografia e registros base antes dos testes ou uso.

## Licença
©2026 Gustavo Henrique Reblin. Todos os direitos reservados.

Este software é de propriedade exclusiva do autor.
Nenhuma parte deste código, documentação ou conteúdo poderá ser copiada, modificada, distribuída ou utilizada, total ou parcialmente, sem autorização expressa e por escrito do detentor dos direitos.

O uso deste sistema é restrito aos fins autorizados pelo proprietário.
O descumprimento destas condições poderá resultar em sanções civis e penais conforme a legislação aplicável.
