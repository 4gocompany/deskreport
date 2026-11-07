# DeskReport

Transforme cards simples em entregas testadas em produção sem queima estúpida de tokens, combinando detecção de harnesses locais (BYOH), roteamento por complexidade com tier gratuito e governança humana.

Criado e mantido pela **[4Go Company](https://github.com/4gocompany)**.

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
