# Inbazz Desafio Backend Pleno - Orquestrador de Pedidos

API em NestJS para receber pedidos via webhook, persistir com idempotência, processar em fila com BullMQ, enriquecer dados usando uma API externa de câmbio e expor consultas administrativas.

> Este README mantém o enunciado original do desafio ao final e adiciona, no início, as instruções e decisões da implementação entregue.

## Implementação

### Stack

- Node.js + NestJS
- PostgreSQL
- Prisma ORM
- Redis + BullMQ
- Swagger
- Jest + Supertest
- API externa Frankfurter para câmbio

### Arquitetura

Fluxo principal:

1. Um sistema externo envia `POST /webhooks/orders`.
2. A API valida o payload com `ValidationPipe` e DTOs.
3. O webhook verifica a `idempotency_key`.
4. O pedido e seus itens são salvos no PostgreSQL com status `RECEIVED`.
5. A API adiciona um job na fila `orders-processing`.
6. O worker consome o job e marca o pedido como `PROCESSING`.
7. O worker chama o módulo de enriquecimento para converter o total para `TARGET_CURRENCY`.
8. Em sucesso, o pedido vira `ENRICHED`.
9. Em falha, BullMQ aplica retry com backoff exponencial.
10. Depois de todas as tentativas, o pedido vira `FAILED_ENRICHMENT` e um registro vai para `orders-dlq`.

Organização principal:

```txt
src/
  modules/
    webhooks/
    orders/
    queue/
    enrichment/
  prisma/
prisma/
  schema.prisma
  migrations/
test/
  helpers/
  webhooks.e2e-spec.ts
  orders.e2e-spec.ts
  queue.e2e-spec.ts
```

### Variáveis de ambiente

Crie um `.env` baseado em `.env.example`:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inbazz_orders?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
TARGET_CURRENCY=BRL
HTTP_TIMEOUT=5000
```

Observações:

- `DATABASE_URL` aponta para o PostgreSQL.
- `REDIS_HOST` e `REDIS_PORT` apontam para o Redis usado pelo BullMQ.
- `TARGET_CURRENCY` define a moeda final do enriquecimento.
- `HTTP_TIMEOUT` define o timeout das chamadas HTTP externas em milissegundos.

### Como rodar localmente

Instale dependências:

```bash
npm install
```

Gere o Prisma Client:

```bash
npx prisma generate
```

Rode as migrations:

```bash
npx prisma migrate dev
```

Suba PostgreSQL e Redis localmente e inicie a API:

```bash
npm run start:dev
```

A aplicação roda por padrão em:

```txt
http://localhost:3000
```

Swagger:

```txt
http://localhost:3000/api
```

### Endpoints

#### Webhook de pedidos

`POST /webhooks/orders`

Payload:

```json
{
  "order_id": "ext-123",
  "customer": {
    "email": "user@example.com",
    "name": "Ana"
  },
  "items": [
    {
      "sku": "ABC123",
      "qty": 2,
      "unit_price": 59.9
    }
  ],
  "currency": "USD",
  "idempotency_key": "uuid-or-hash"
}
```

Resposta:

```json
{
  "id": "order-id",
  "status": "RECEIVED"
}
```

#### Consulta de pedidos

`GET /orders`

Aceita filtro opcional:

```txt
GET /orders?status=ENRICHED
```

`GET /orders/:id`

Retorna os detalhes do pedido, incluindo itens e dados de enriquecimento.

#### Métricas da fila

`GET /queue/metrics`

Exemplo de resposta:

```json
{
  "waiting": 0,
  "active": 0,
  "completed": 10,
  "failed": 1,
  "delayed": 0,
  "dlq": {
    "waiting": 1,
    "active": 0,
    "completed": 0,
    "failed": 0
  }
}
```

### Status do pedido

- `RECEIVED`: pedido recebido e persistido.
- `PROCESSING`: worker iniciou o processamento.
- `ENRICHED`: enriquecimento concluído com sucesso.
- `FAILED_ENRICHMENT`: todas as tentativas de enriquecimento falharam.

### Idempotência

A API usa `idempotency_key` para evitar duplicidade:

- Se a chave já existe, retorna o pedido existente.
- Se duas requisições chegam ao mesmo tempo, a constraint única do banco protege contra duplicação.
- O erro de chave única do Prisma (`P2002`) é tratado para retornar o pedido já persistido.

### Fila, Retry E DLQ

A fila principal se chama `orders-processing`.

Cada job usa:

- `jobId` igual ao id do pedido.
- `attempts: 3`.
- backoff exponencial com delay inicial de `2000ms`.

Quando um job falha todas as tentativas:

- o pedido recebe status `FAILED_ENRICHMENT`;
- o motivo fica salvo em `failureReason`;
- um job com os dados da falha é enviado para `orders-dlq`.

### Enriquecimento

O módulo `enrichment` usa a API Frankfurter para buscar taxa de câmbio e converter `totalAmount` para `TARGET_CURRENCY`.

Se a moeda do pedido já for a moeda alvo, a conversão é resolvida localmente com taxa `1`.

### Testes

Unitários:

```bash
npm test
```

E2E:

```bash
npm run test:e2e
```

Build:

```bash
npm run build
```

A suite cobre:

- webhook válido;
- webhook inválido;
- idempotência;
- enfileiramento;
- processamento assíncrono;
- enriquecimento;
- retry e DLQ;
- endpoints de consulta;
- métricas da fila.

### Decisões técnicas

- Controllers ficam finos e delegam regra de negócio para services.
- Repositories concentram acesso ao Prisma.
- A fila desacopla resposta do webhook do processamento externo.
- Idempotência é garantida por consulta prévia e constraint única no banco.
- Retry fica sob responsabilidade do BullMQ.
- DLQ dá visibilidade para falhas definitivas.
- Testes e2e usam controllers reais e services mockados para validar HTTP e DTOs sem depender de infraestrutura externa.

---

## Enunciado original do desafio

# Desafio Backend Pleno - Orquestrador de Pedidos

Criar uma API que:
1. Receba pedidos via **webhook**.
2. **Valide** e **enfileire** para processamento assíncrono.
3. **Enriqueça os dados** do pedido consultando um **serviço externo**.
4. Utilize **filas** para processamento e **mecanismos de retry** em caso de falhas.
5. Demonstre **boas práticas de código e arquitetura**.
6. Utilizar **NestJS**.

---

### Receber Pedido (Webhook)
`POST /webhooks/orders`

**Exemplo de payload:**
```json
{
  "order_id": "ext-123",
  "customer": { "email": "user@example.com", "name": "Ana" },
  "items": [{ "sku": "ABC123", "qty": 2, "unit_price": 59.9 }],
  "currency": "USD",
  "idempotency_key": "uuid-or-hash"
}
```

**Requisitos:**
- Validar o payload recebido.
- Garantir **idempotência** (não processar o mesmo pedido duas vezes).
- Enfileirar o pedido para processamento.
- Persistir o pedido no banco (status inicial: `RECEIVED`).

---

### Enriquecimento
- Consultar um **serviço externo** para complementar informações do pedido (por exemplo, converter o total para outra moeda ou validar dados de cliente).
- Atualizar o pedido com as informações obtidas.
- Em caso de erro:
    - Retentar algumas vezes com backoff.
    - Caso todas as tentativas falhem, enviar o job para uma **DLQ (Dead Letter Queue)**.
    - Atualizar o status para `FAILED_ENRICHMENT`.

---

### Consulta e Administração
- `GET /orders` - listar pedidos, com filtro opcional por status.
- `GET /orders/:id` - exibir os detalhes de um pedido.
- `GET /queue/metrics` - exibir informações gerais da fila.

---

### Sugestão de Integração Externa
Você pode escolher **qualquer serviço externo público** para demonstrar o uso de integrações.
Algumas possibilidades incluem:
- API de câmbio (ex.: para converter valores de moedas);
- API de CEP (ex.: para validar endereços de clientes);
- API de produtos (ex.: para validar SKUs);
- API de tempo ou geolocalização (apenas para demonstrar integração).
---

### Testes (opcionais)
Os testes são opcionais, mas podem demonstrar melhor sua capacidade de estruturar o código e validar comportamentos.
É importante que o fluxo da **fila** esteja representado nos testes, validando o processamento assíncrono e as transições de status.

---
### Entregáveis
Repositório público (GitHub ou GitLab) com o código do desafio implementado.
