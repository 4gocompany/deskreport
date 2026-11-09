# Changelog do DeskReport

Todas as mudanças relevantes no DeskReport são documentadas neste arquivo.
O formato baseia-se no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto segue o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [1.1.0] - 2026-11-09

### Novidades
- **Identificação de Ambiente:** A barra de status global agora exibe os nomes amigáveis ou hostnames das máquinas conectadas, em vez de um texto genérico.
- **Rastro de Execução nos Cards:** Os cards de tarefas no Kanban exibem em tempo real a máquina e a pasta onde cada agente está trabalhando.
- **Identidade da Máquina no Runner:** O gateway informa a identidade única autenticada da máquina (`machine:identity`) para prevenção de spoofing e rastreamento seguro.

### Melhorias
- **Restauração do MCP no OpenCode:** Injetada a configuração do servidor MCP do DeskReport nas variáveis de execução do OpenCode, garantindo acesso completo às ferramentas de criação e atualização de tarefas.
- **Telemetria Enriquecida:** O payload de telemetria dos agentes agora propaga `machineName`, `machineId` e `workspace` de forma contínua para o painel web.

### Correções
- **Proteção Contra Erros de Workspace Concorrente:** O runner local agora ignora silenciosamente despachos de projetos que não pertencem ao workspace daquela máquina, impedindo que uma estação aborte indevidamente a tarefa da outra.

### Segurança
- **Fim do Broadcast Cego:** O gateway de agentes agora despacha tarefas de forma direcionada, eliminando a execução não autorizada em múltiplos computadores da mesma organização.
- **Isolamento Multi-Tenant de Telemetria:** A identidade da máquina é validada no handshake criptográfico por SHA-256 no backend, impedindo adulteração de origem.

---

## [1.0.0] - 2026-11-07

### Novidades
- **Lançamento Oficial do DeskReport:** Publicação do projeto sob a licença Business Source License 1.1 (BSL 1.1), garantindo uso gratuito para desenvolvimento pessoal e interno em empresas.
- **BYOH (Bring Your Own Harness):** Suporte nativo para rodar com agentes de código locais instalados no computador do desenvolvedor (Claude Code, OpenCode, Antigravity, Gemini CLI e Codex).
- **Roteamento de Complexidade em Duas Camadas:** Classificação prévia de tarefas para evitar desperdício de cotas, direcionando demandas simples para modelos gratuitos/econômicos e tarefas críticas para modelos de raciocínio.
- **Esteira com Papéis:** Organização do ciclo de desenvolvimento em etapas (Especificação, Engenharia, QA, Code Review e DevOps) com aprovação humana obrigatória.
- **Painel Web e Widget Local:** Interface completa em React com quadro Kanban, drawer de tarefas com histórico, e widget desktop de controle local com travas de segurança de cotas.
