# PreçoCerto — pesquisa de preços

Aplicação responsiva para divulgar e pesquisar promoções em tempo real. O público filtra ofertas por produto, categoria e estabelecimento; administradores cadastram e atualizam promoções em um painel protegido.

## Recursos

- Vitrine responsiva com busca, filtros e ordenação
- Preço normal, promocional e percentual de desconto
- Período de validade e desativação automática após o término
- Painel em `/admin` para criar, editar, pausar e excluir promoções
- Atualização em tempo real via Server-Sent Events
- API REST em JavaScript (Node.js + Express)
- MySQL 8 com consultas parametrizadas
- Dados iniciais para demonstração

## Início rápido com Docker

1. Instale Node.js 20+ e Docker.
2. Execute `docker compose up -d`.
3. Copie `.env.example` para `.env` e use:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=precos_app
DB_PASSWORD=precos_local
DB_NAME=pesquisa_precos
ADMIN_API_KEY=crie-uma-chave-segura
```

4. Execute `npm install`.
5. Execute `npm run dev`.
6. Abra `http://localhost:3000`. O painel fica em `http://localhost:3000/admin`.

## Instalação em MySQL existente

Execute `database/schema.sql` no seu servidor MySQL, crie o arquivo `.env` e informe as credenciais. Nunca publique o arquivo `.env`.

## Endpoints

- `GET /api/promotions` — pesquisa pública
- `GET /api/stores` — estabelecimentos
- `GET /api/events` — atualizações em tempo real
- `GET /api/admin/promotions` — listagem administrativa
- `POST /api/promotions` — cadastrar promoção
- `PUT /api/promotions/:id` — editar promoção
- `PATCH /api/promotions/:id/status` — ativar ou pausar
- `DELETE /api/promotions/:id` — excluir

As rotas administrativas exigem o cabeçalho `x-admin-key`.

## Produção

Use HTTPS, uma chave administrativa longa, usuário MySQL com privilégios mínimos e variáveis de ambiente da plataforma. O processo inicia com `npm start`.
