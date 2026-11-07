# DeskReport

Transforme cards simples em entregas testadas em produção sem queima estúpida de tokens, combinando detecção de harnesses locais (BYOH), roteamento por complexidade com tier gratuito e governança humana.

Criado e mantido pela **[4Go Company](https://github.com/4gocompany)** por **[Rodrigo Andrade](https://github.com/rodriggopda)**.

---

## Origem e Histórico do Projeto

O DeskReport nasceu em **janeiro de 2024** da necessidade de rastrear etapas e demandas de desenvolvimento sem a lentidão e burocracia excessiva de ferramentas como o Jira. Com o avanço do desenvolvimento assistido por agentes de IA no terminal, o projeto evoluiu para ser o hub de orquestração local desses harnesses.

Para fins de registro público, histórico de commits e anterioridade:
- **Repositório Frontend Original (Jan/2024)**: [rodriggopda/deskreport.com.br](https://github.com/rodriggopda/deskreport.com.br) (Primeiro commit: `247f6d6 project base` em 30 de janeiro de 2024).
- **Repositório Backend API Original (Jul/2024)**: [rodriggopda/api.deskreport.com.br](https://github.com/rodriggopda/api.deskreport.com.br) (Primeiro commit: `dde812e project base` em 20 de julho de 2024).

Ambos os repositórios originais estão mantidos no perfil pessoal do autor como arquivos históricos, consolidando toda a continuidade e evolução ativa neste repositório oficial.

---

## Estrutura do Repositório

- `api/`: Backend em NestJS com Prisma, WebSockets em tempo real e orquestrador de agentes.
- `web/`: Aplicação web frontend em React com Tailwind, Kanban, drawer de tarefas e widget.
- `api/cli/`: Daemon local (`deskreport`) e servidor MCP para integração direta com harnesses.

---

## Licença e Marca

- **Código**: Distribuído sob [Business Source License 1.1 (BSL 1.1)](./LICENSE), convertendo-se em Apache 2.0 após 4 anos. O uso interno e self-hosted é livre e gratuito. É vedada a revenda, comercialização como SaaS ou redistribuição paga a terceiros sem licença comercial da 4Go Company.
- **Marca e Logotipo**: Todos os direitos reservados à 4Go Company. Consulte nossa [Política de Marca](./TRADEMARK.md).
- **Contribuições**: Aceitamos discussões e relatos de bugs via Issues. Não aceitamos Pull Requests externos de código. Consulte as [Diretrizes](./CONTRIBUTING.md).
