# SPEC-MICRO-ROUTER: Router de Complexidade e Estratégia Free Tier (Fase 2)

## 1. Visão Geral e Objetivo

O Micro-Router é a camada inteligente de decisão do DeskReport que categoriza as tarefas por nível de esforço cognitivo antes da execução pelo harness principal.

O objetivo é eliminar o desperdício de tokens caros de raciocínio profundo (frontier) em tarefas triviais ou leituras de contexto, direcionando cada demanda para o perfil de modelo e provedor com melhor relação custo-benefício, priorizando o Free Tier (custo zero).

---

## 2. Modelagem de Dados

### 2.1 Alteração no Prisma Schema

No arquivo [prisma/schema.prisma:9](prisma/schema.prisma#L9), o model `Task` recebe o campo de complexidade:

```prisma
model Task {
  id          String    @id @default(uuid())
  companyId   String    @map("company_id")
  shortId     Int       @map("short_id")
  title       String
  project     String
  description String?
  reporterId  String?   @map("reporter_id")
  assignees   User[]    @relation("task_assignees")
  teamId      String?   @map("team_id")
  status      String    @default("todo")
  priority    String    @default("medium")
  tags        Json?
  dueDate     DateTime? @map("due_date")
  tokensUsed  Int       @default(0) @map("tokens_used")
  tokenBudget Int       @default(50000) @map("token_budget")
  waitingFor  Json?     @map("waiting_for")

  // Nível de complexidade da tarefa: low (eco/free), medium ou high (frontier)
  complexity  String    @default("low")

  team         Team?              @relation(fields: [teamId], references: [id], onDelete: SetNull)
  comments     TaskComment[]
  chatSessions AgentChatSession[]
  attachments  TaskAttachment[]
  createdAt    DateTime           @default(now()) @map("created_at")
  updatedAt    DateTime           @updatedAt @map("updated_at")

  @@unique([companyId, shortId])
  @@map("tasks")
}
```

Valores permitidos para `complexity`:
- `low`: tarefas de triagem, documentação, ajustes cosméticos e specs simples.
- `medium`: CRUDs, migrations de banco, rotas REST e componentes de interface.
- `high`: mudanças arquiteturais, segurança multi-tenant e regras de negócio críticas.

---

## 3. Classificador de Complexidade Leve (Micro-Router)

### 3.1 Regras de Classificação

O classificador avalia o título, a descrição, as tags e os arquivos mencionados na tarefa. A classificação é determinística e rápida:

1. **Tier Low (Eco/Free)**:
   - Critérios: Documentação (README, docs markdown), ajustes de CSS, estilização, formatação, correção de digitação, lint, testes unitários isolados ou criação de specs simples.
   - Padrões de texto: `doc`, `readme`, `css`, `html`, `lint`, `format`, `typo`, `ajuste de texto`, `spec simples`.
   - Perfil sugerido: `free`.

2. **Tier Medium**:
   - Critérios: CRUDs, migrations de banco, endpoints REST normais, controllers, serviços comuns, componentes com especificação já definida.
   - Padrões de texto: `crud`, `migration`, `prisma`, `endpoint`, `controller`, `componente`, `tela`, `schema`, `service`.
   - Perfil sugerido: `eco`.

3. **Tier High (Frontier/Thinking)**:
   - Critérios: Decisões arquiteturais de núcleo, concorrência, segurança multi-tenant, autenticação e autorização, refatoração de regras de negócio essenciais, otimização crítica de performance.
   - Padrões de texto: `arquitetura`, `segurança`, `multi-tenant`, `auth`, `concorrência`, `performance crítica`, `refatoração crítica`.
   - Perfil sugerido: `frontier`.

### 3.2 Formato JSON de Saída

```json
{
  "complexity": "low",
  "reason": "Tarefa identificada como documentação ou ajuste textual",
  "suggestedProfile": "free",
  "suggestedAgent": "antigravity",
  "suggestedModel": "gemini-2.5-flash"
}
```

---

## 4. Mapeamento de Perfis de Provedores

### 4.1 Hierarquia de Provedores por Tier

| Complexidade | Perfil Recomendado | Provedores Primários (Prioridade 1) | Provedor Secundário (Fallback) |
| :--- | :--- | :--- | :--- |
| **Low** | `free` (Custo Zero) | Antigravity CLI (agy / Gemini Free), Ollama local | Modelos econômicos (Gemini Flash, Claude Haiku) |
| **Medium** | `eco` (Econômico) | Modelos rápidos e econômicos (Gemini Flash, Claude Haiku) | Codex padrão / Claude Sonnet |
| **High** | `frontier` (Raciocínio) | Modelos frontier com raciocínio (Claude Sonnet/Opus com thinking, Codex avançado) | Modelos frontier alternativos |

### 4.2 Resolução no Despacho Local

No arquivo [cli/deskreport-client.mjs:834](cli/deskreport-client.mjs#L834), o comando do agente respeita o perfil indicado caso nenhum modelo fixo tenha sido sobrescrito na configuração local (`config.models[agent]`).

---

## 5. Tratamento de Rate Limits (429 & Quotas) e Fallback

### 5.1 Backoff Exponencial para 429 (RPM)

Quando a execução de um agente no client local [cli/deskreport-client.mjs:920](cli/deskreport-client.mjs#L920) interceptar erro 429 ou esgotamento temporário:
- Tentativa 1: pausa de 2 segundos antes da retentativa.
- Tentativa 2: pausa de 4 segundos antes da retentativa.
- Tentativa 3: pausa de 8 segundos antes da retentativa.

### 5.2 Fallback Dinâmico de Provedor

Se as 3 tentativas falharem ou o harness retornar erro definitivo de cota esgotada (`LIMIT_PATTERN`):
1. O client seleciona o provedor secundário configurado para a máquina ou o próximo agente habilitado daquele papel.
2. É postado automaticamente um comentário na tarefa via API [src/modules/tasks/tasks.controller.ts:48](src/modules/tasks/tasks.controller.ts#L48):
   `"Aviso de Roteamento: Cota esgotada no provedor principal. Alternando automaticamente para o provedor secundário (harness: <nome>, modelo: <modelo>)."`
3. A tarefa é reiniciada no novo harness sem perda de contexto ou intervenção manual necessária.

---

## 6. Contratos de API e Rotas

### 6.1 Classificar Tarefa

- **Rota**: `POST /tasks/:id/classify`
- **Descrição**: Analisa os dados da tarefa, calcula o tier de complexidade, persiste o campo `complexity` no banco e retorna a decisão.
- **Resposta**:
```json
{
  "id": "uuid-da-tarefa",
  "shortId": 38,
  "complexity": "low",
  "routing": {
    "profile": "free",
    "suggestedAgent": "antigravity",
    "suggestedModel": "gemini-2.5-flash",
    "reason": "Classificado como low por conter foco em documentação"
  }
}
```

### 6.2 Criação e Atualização de Tarefas

Em [src/modules/tasks/tasks.controller.ts:16](src/modules/tasks/tasks.controller.ts#L16) e [src/modules/tasks/tasks.service.ts:9](src/modules/tasks/tasks.service.ts#L9):
- No `POST /tasks`: se o cliente não enviar `complexity`, o classificador roda automaticamente e grava o valor inicial.
- No `PUT /tasks/:id`: permite ajuste manual do campo `complexity` caso o usuário queira forçar outro tier.

### 6.3 Payload de Despacho (Dispatch)

Em [src/modules/agents/agents.service.ts:336](src/modules/agents/agents.service.ts#L336) e [src/modules/agents/agents.gateway.ts:212](src/modules/agents/agents.gateway.ts#L212):
O evento `agent:dispatch` emitido para a máquina conectada inclui os novos atributos:
```json
{
  "taskId": "uuid",
  "title": "Título",
  "agent": "codex",
  "complexity": "low",
  "suggestedProfile": "free",
  "suggestedModel": "gemini-2.5-flash"
}
```

---

## 7. Critérios de Aceite

1. O campo `complexity` existe no model `Task` do Prisma com valor padrão `low`.
2. A rota `POST /tasks/:id/classify` classifica corretamente títulos e descrições com regras leves e sem complexidade desnecessária.
3. Tarefas criadas sem complexidade explícita são avaliadas automaticamente.
4. O payload emitido em `agent:dispatch` traz as orientações de complexidade e perfil para o client local.
5. O client local implementa o backoff exponencial de 3 tentativas para respostas 429 e executa o chaveamento de provedor com aviso em comentário.
6. Nenhum travessão é utilizado no código, documentação ou mensagens geradas.
