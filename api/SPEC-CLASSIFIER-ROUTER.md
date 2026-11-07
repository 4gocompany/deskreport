# SPEC-CLASSIFIER-ROUTER: Classificador de Tarefas em Duas Camadas (Jev e Fallback Local Gratuito)

## 1. Visão Geral e Objetivo

Antes de qualquer agente abrir arquivos ou executar código, a tarefa precisa ser classificada com precisão pelo seu nível real de complexidade: `low`, `medium` ou `high`.

Hoje, a classificação por regex puro falha com frequência, rebaixando tarefas de engenharia e UI para `low` e induzindo modelos fracos a caçar arquivos pelo disco e gerar erros.

Esta especificação define o **Classificador em Duas Camadas**:
1. **Camada 1 (Jev / System One)**: Para quando houver chave configurada (`JEV_API_KEY` ou `OPENROUTER_API_KEY`), utilizando a API de decisões do modelo `~typesafe/jev-latest` da TypeSafe AI via endpoint `/api/alpha/decisions` do OpenRouter. Resposta determinística, em milissegundos e custo quase nulo.
2. **Camada 2 (Fallback Local Gratuito)**: O padrão nativo da máquina, sem nenhum custo adicional. Eleger o harness local de menor custo instalado (`opencode` com modelo free > `claude` forçando `--model haiku` > `codex` com `mini` > `antigravity` com `flash`) para executar uma triagem estrita em modo somente leitura (sem permissão de escrita, sem comandos de bash e sem execução de código).

---

## 2. Princípios Inegociáveis

1. **Separação Estrita (Classificar ≠ Executar)**:
   - O classificador nunca toca em arquivos, não faz commits e não roda ferramentas de desenvolvimento.
   - O classificador devolve apenas um JSON estruturado de triagem.
2. **Garantia de Economia (Menor Custo Sempre)**:
   - Jamais gastar modelos frontier (`claude-sonnet`, `claude-opus`, `gpt-4o`) para triagem.
   - Forçar explicitamente o tier econômico ou gratuito na chamada de classificação.
3. **Guarda Defensiva (Sanity Check)**:
   - Se o modelo classificar como `low`, mas a descrição contiver termos de risco (`prisma`, `migration`, `schema`, `banco`, `auth`, `multi-tenant`, `seguranca`, `token`, `secret`), a guarda eleva automaticamente para `medium` ou `high`.
4. **Zero Travessões**:
   - Nenhum caractere de travessão em comentários, código, logs ou especificações.

---

## 3. Arquitetura das Duas Camadas

```
+-------------------------------------------------------------+
|             Nova Tarefa (Título + Descrição + Tags)         |
+-------------------------------------------------------------+
                              |
                              v
             Possui chave JEV ou OpenRouter?
                 /                         \
           SIM  /                           \  NÃO
               v                             v
+-------------------------------+   +------------------------------------+
|  Camada 1: Jev Decision API  |   |  Camada 2: Fallback Local Gratuito |
|  - OpenRouter decisions route |   |  - Eleição do harness mais barato  |
|  - Modelo: ~typesafe/jev-lat. |   |    (OpenCode Free > Haiku > Mini)  |
|  - Resposta tipada com score  |   |  - Read-only estrito, sem bash/git |
+-------------------------------+   +------------------------------------+
               \                             /
                \                           /
                 v                         v
+-------------------------------------------------------------+
|            Guarda Defensiva (Sanity Check por Regex)        |
|  (Protege contra alucinações de modelo fraco em termos DB)  |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|        Atualização da Tarefa (complexity + pipeline)        |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|    Despacho da Execução Real para o Especialista Correto    |
|   (Low: Free/Eco | Medium/High: Claude Code / Antigravity)  |
+-------------------------------------------------------------+
```

---

## 4. Camada 1: Jev Decision API (TypeSafe AI)

Quando a variável de ambiente `OPENROUTER_API_KEY` ou `JEV_API_KEY` estiver preenchida (no `.env` da API ou na configuração do client), a chamada é feita via `fetch` nativo no Node.js:

- **Endpoint**: `https://openrouter.ai/api/alpha/decisions`
- **Headers**:
  - `Authorization: Bearer <CHAVE>`
  - `Content-Type: application/json`
- **Payload**:
```json
{
  "model": "~typesafe/jev-latest",
  "state": {
    "title": "Melhorar Card e Modal de Tarefas",
    "description": "Exibir etapas na vertical e rastro do modelo nos comentários"
  },
  "questions": {
    "complexity": {
      "type": "choice",
      "instructions": "Classifique a complexidade técnica desta tarefa de software",
      "criteria": {
        "low": "Documentação, typos, ajustes cosméticos de texto ou tarefas triviais sem lógica",
        "medium": "Interfaces, modais, componentes React, CRUDs, migrations de banco, endpoints e rotas",
        "high": "Arquitetura, segurança multi-tenant, concorrência, autenticação ou refatorações críticas"
      }
    }
  }
}
```

- **Resposta**:
O Jev retorna diretamente o `choice` vencedor (`low`, `medium` ou `high`) e a pontuação de confiança calibrada. Se a confiança for menor que 0.65, promove para o tier imediatamente superior por segurança.

---

## 5. Camada 2: Fallback Local Gratuito (Harness de Menor Custo)

Quando não houver chave do Jev, o runner local (`deskreport-client.mjs`) assume a triagem elegendo o agente mais barato:

### 5.1 Ordem de Eleição da Máquina
1. **OpenCode** (se presente em `enabledAgents` ou instalado no PATH):
   - Comando: `opencode run --auto` (usando o perfil gratuito).
2. **Claude Code** (se for o único ou preferencial):
   - Comando: `claude -p "<PROMPT>" --model haiku --output-format json` (forçando `haiku` explicitamente para não gastar tokens de Sonnet/Opus).
3. **Codex**:
   - Comando: `codex exec --model mini -p "<PROMPT>"`.
4. **Antigravity / Gemini**:
   - Comando: `gemini --yolo --model gemini-2.5-flash -p "<PROMPT>"`.

### 5.2 Prompt Estrito de Triagem (Isolamento Total)
O agente classificador recebe o prompt abaixo e **não recebe ferramentas de edição**:
```text
Você é o classificador de complexidade do DeskReport.
Analise a tarefa abaixo e responda APENAS com um objeto JSON na linha final, sem explicações em volta.

Tarefa:
Título: {title}
Descrição: {description}
Tags: {tags}

Opções de complexidade:
- "low": Documentação pura (README), correção de textos/typos ou formatação sem código executável.
- "medium": Telas, modais, componentes de interface, endpoints de API, migrations de banco, CRUDs e integrações.
- "high": Segurança, isolamento multi-tenant, autenticação, concorrência, pagamentos ou arquitetura crítica.

Formato obrigatório da resposta:
{"complexity": "low" | "medium" | "high", "reason": "motivo curto em uma frase", "needsSpec": boolean}
```

### 5.3 Timeout e Restrição
- Timeout máximo de execução: 15 segundos.
- Não carregar histórico de git nem anexos pesados.

---

## 6. Guarda Defensiva (Sanity Check)

Para eliminar o risco de alucinação de modelos gratuitos:

```typescript
export function applySanityCheck(complexity: string, text: string): { complexity: string; reason?: string } {
  const normalized = text.toLowerCase();
  const criticalPattern = /multi-?tenant|seguranc|auth|permiss|crypto|cripto|token|secret|faturam|pagamento/;
  const structuralPattern = /migration|migrac|prisma|schema|banco|endpoint|controller|service|modal|card|componente|tela|interface|api/;

  if (complexity === 'low') {
    if (criticalPattern.test(normalized)) {
      return { complexity: 'high', reason: 'Promovido para high por conter termos de arquitetura ou segurança' };
    }
    if (structuralPattern.test(normalized)) {
      return { complexity: 'medium', reason: 'Promovido para medium por envolver código de interface, banco ou API' };
    }
  }

  if (complexity === 'medium' && criticalPattern.test(normalized)) {
    return { complexity: 'high', reason: 'Promovido para high por conter termos críticos de segurança' };
  }

  return { complexity };
}
```

---

## 7. Contratos de API e Despacho

### 7.1 Rota na API (`POST /tasks/:id/classify`)
Permite reclassificar uma tarefa a qualquer momento.
- Payload opcional: `{ force: true }`
- Executa a Camada 1 se houver chave; caso contrário, executa as regras estruturadas locais.

### 7.2 Evento no Client Local (`machine:classify-task`)
Quando uma tarefa chega sem complexidade definida ou com flag `needsClassification: true`:
1. O client roda a Camada 1 (Jev) se tiver chave local, ou a Camada 2 (Fallback Local).
2. O client aplica o `applySanityCheck`.
3. O client envia via socket o resultado para a API:
   `socket.emit('task:classified', { taskId, complexity, reason, needsSpec })`
4. A API atualiza a tarefa no banco e prossegue com o despacho para o agente definitivo.

---

## 8. Critérios de Aceite

1. O classificador nunca edita arquivos nem roda comandos bash no repositório.
2. Com chave `OPENROUTER_API_KEY` ou `JEV_API_KEY`, o Jev `/api/alpha/decisions` é utilizado prioritariamente.
3. Sem chave externa, o harness local mais barato é eleito (OpenCode Free > Claude Haiku > Codex Mini).
4. O `applySanityCheck` impede que tarefas com banco, interface ou segurança sejam marcadas como `low`.
5. Tarefas `medium` e `high` nunca são despachadas para execução de código com modelo gratuito sem antes passar pelo especialista adequado.
6. Código limpo, enxuto, sem travessões e com isolamento multi-tenant mantido.
