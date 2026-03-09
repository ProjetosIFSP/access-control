# CLAUDE.md

Sistema completo de controle de acesso e gerenciamento de salas no IFSP-PEP, baseado em IoT com autenticação biométrica e RFID, desenvolvido como Trabalho de Conclusão de Curso.

## Itens de instrução

- **Plano de negócio / monografia**: `.claude/monografia_pt1.md`
- **Arquitetura**: `.claude/architecture.md`
- **Padrões e convenções de código**: `.claude/guideline.md`
- **Itens de Hardware possuídos e necessários**: `.claude/items.md`
- **Guias técnicos**: `.claude/guides/` (ex: integração HID, firmware, etc.)
- **Fluxo de testes** (não reflete no produto final): `.claude/test/` — pastas com `.md` de descrição e arquivos de apoio

## Features

- **Índice geral**: `.claude/features/index.md` — tabela com ID, nome, status e observações de todas as features
- **Pendências / próxima tarefa**: `.claude/features/todo.md`
- **Histórico de implementações**: `.claude/features/implemented.md` — ID de tasks, breve descrição e ações tomadas
- **Detalhes por módulo**: `.claude/features/[MÓDULO]/` — pastas separadas por contexto:
  - `AUTH/` — autenticação e sessão
  - `USER/` — gestão de usuários
  - `ROOM/` — gestão de salas e blocos
  - `PERM/` — sistema de permissões
  - `CREDENCIAL/` — credenciais físicas (biometria, RFID)
  - `LOG/` — histórico de acessos
  - `IOT/` — broker MQTT e protocolo
  - `UI/` — interface web (frontend)
  - `INFRA/` — docker, CI/CD, monitoramento
  - `HARDWARE/` — firmware ESP8266/ESP32

Cada arquivo de feature deve conter: informações gerais, descrição, funcionalidades, critérios de aceite (checklist), dependências, bloqueios e notas de implementação.

---

## Planejamento

- `.claude/features/index.md` com overview de todas as features:

```
| ID        | Feature                                             | Status        | Observações                  |
|-----------|-----------------------------------------------------|---------------|------------------------------|
| AUTH-001  | Autenticação via cookie (better-auth)               | Concluído     | Login, logout, sessão, `/me` |
| AUTH-002  | Redefinição de senha (forgot/reset)                 | Concluído     | Fluxo completo com token     |
```

- `.claude/features/todo.md` separado por "Tasks concluídas nesta sessão" e "Pendente / Próxima tarefa"
- `.claude/features/implemented.md` com ID de tasks, breve descrição e ações tomadas

---

## Estilo de Resposta

- Forneça explicações compreensivas
- Inclua o contexto e o raciocínio por trás das recomendações
- Explique o "porquê", não apenas o "como"

## Abordagem de Resolução de Problemas

- Divida problemas complexos em etapas claras
- Mostre seu processo de raciocínio
- Valide cada etapa antes de prosseguir

## Code Style

- Escreva código limpo e autoexplicativo
- Use nomes de variáveis e funções descritivos
- Minimize os comentários, a menos que sejam essenciais para a clareza

## Gerenciamento de Tarefas

- Mantenha as features do projeto sempre atualizadas após cada sessão
- Tome a iniciativa em relação às próximas etapas óbvias
- Sugira melhorias e otimizações
- Antecipe possíveis problemas e soluções

## Diretrizes de Desenvolvimento

- Siga os padrões e convenções de código existentes (ver `.claude/guideline.md`)
- Considere as implicações de segurança e desempenho
- Priorize implementação de testes automatizados
- Teste as alterações sempre que possível