# VISAO: DeskReport

## 1. Em uma frase

DeskReport transforma cards em entregas revisadas usando os agentes de código que o dev já tem na máquina, sem queimar token à toa. Grátis e open source, feito pela 4Go.

## 2. Por que existe

- O dev já paga Claude, Codex ou similar e roda tudo em terminais soltos, sem fila, sem histórico e sem saber quanto cada entrega custou.
- A cota acaba no meio da tarefa e o trabalho para.
- Tarefa simples gasta modelo caro, e modelo fraco em tarefa difícil sai procurando arquivo pelo disco.
- Ninguém revisa o que o agente fez antes de ir para produção.

## 3. Decisão de negócio

- **O DeskReport não será cobrado.** Ele é a vitrine técnica do Rodrigo como dev e da 4Go como empresa.
- **O retorno esperado é visibilidade**: estrelas e contribuições no GitHub, conteúdo publicado com números reais e clientes chegando para os serviços da 4Go.
- **Sem revenda de token.** Cada pessoa usa os próprios harnesses e paga o provedor direto (BYOH).

## 4. Para quem

1. Dev que usa mais de um agente de código e quer fila, histórico e economia de cota.
2. Time pequeno e software house que quer ver o que os agentes entregaram, por quem e com qual modelo.
3. A própria 4Go, que usa o DeskReport em todos os projetos dela.

## 5. Por que usariam

1. **A assinatura rende mais**: trava de cota, roteamento por complexidade e troca de harness quando a cota acaba.
2. **O código não sai da máquina**: execução local, sem sandbox na nuvem.
3. **Um painel para todos os harnesses**: Claude Code, OpenCode, Antigravity, Codex, Gemini e Aider.
4. **Esteira com papéis e revisão**: spec, desenvolvimento, QA, review e deploy, com humano aprovando.
5. **Rastro completo**: cada comentário mostra pessoa ou agente, harness e modelo.

## 6. Princípios

- **Open source**: CLI, API e painel públicos, com licença permissiva (MIT ou Apache 2.0, a decidir).
- **Segurança é reputação**: isolamento multi-tenant absoluto, nenhum segredo em log, resposta ou commit.
- **Instalação em 1 minuto**: instalar, conectar e ver o primeiro card rodando.
- **Código simples e humano**: o repositório é portfólio público de como a 4Go trabalha.
- **Assinatura da 4Go**: "feito pela 4Go" no widget, no painel e no README, com link.

## 7. Hipóteses a validar

| Hipótese | Como medir | Meta inicial |
| :--- | :--- | :--- |
| O roteador economiza cota de verdade | Tokens por card antes e depois do classificador (#044) | Queda visível nos cards low e medium |
| A esteira entrega com qualidade | Taxa de aprovação no primeiro review | Maioria aprovada sem retrabalho |
| A instalação é rápida | Tempo do `install.sh` até o primeiro card rodando | Menos de 5 minutos |
| O projeto gera visibilidade | Estrelas, forks, issues e contatos comerciais citando o DeskReport | Primeiro contato comercial vindo do projeto |

## 8. Próximos passos

1. **Auditoria de segredos antes de abrir o código** (tarefa própria). Nada é publicado antes dela.
2. **Medir a 4Go por 30 dias**: custo e tokens por card, economia do roteador, aprovação no review e tempo do card até o deploy.
3. **Limites simples por organização** no app hospedado (máquinas, tarefas por dia, retenção de logs) para o uso gratuito não virar custo descontrolado.
4. **README público** em português e inglês, com GIF do fluxo card até entrega.
5. **Publicar o primeiro relato** com os números dos 30 dias.

## 9. Fora de escopo por agora

- Planos pagos, cobrança e billing.
- Revenda de tokens ou de acesso a modelos.
- Sandbox de execução na nuvem.
