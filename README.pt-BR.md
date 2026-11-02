[![Next.js 15](https://img.shields.io/badge/Next.js_15-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![tRPC 11](https://img.shields.io/badge/tRPC_11-2563EB?style=flat-square&logo=trpc&logoColor=white)](https://trpc.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev/)

[English](README.md) · Português

[Case](docs/case.pdf)

# Task Nexus: Next.js 15 + tRPC

Um gerenciador de tarefas simples. O backend mantém as tarefas em memória (sem banco de dados) e as expõe via tRPC. O frontend é renderizado no servidor no primeiro carregamento e usa React Query no cliente para paginação, filtros e mutações.

## Como executar

Requisitos: Node.js 20+ e npm.

```bash
npm install
npm run dev              # http://localhost:3000
```

Build de produção:

```bash
npm run build
npm run start            # http://localhost:3000
```

Testado no Windows 10 e no WSL.

O Playwright precisa de um navegador na primeira vez que os testes end-to-end forem executados:

```bash
npx playwright install chromium
```

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm run start` | Build e servidor de produção |
| `npm run typecheck` | Checagem de tipos do projeto inteiro, incluindo os testes |
| `npm run lint` | ESLint (regras do Next.js) |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Testes end-to-end (Playwright, roda usando o build de produção) |
| `npm run check` | Typecheck, lint, testes unitários e testes end-to-end |

## Funcionalidades

- Criar, editar, concluir e excluir tarefas.
- Buscar por título ou descrição, filtrar por status (todas, pendentes, concluídas) e ordenar por data de criação (mais recentes ou mais antigas primeiro).
- Infinite scroll, com botão "load more" como alternativa.
- Cards de resumo com o progresso de conclusão.
- Confirmação antes de excluir, com notificações de sucesso e erro.
- Menu de debug na barra de navegação: gera até 500 tarefas aleatórias (com seed opcional para dados reproduzíveis) ou apaga todas as tarefas.
- Modo claro e escuro, de acordo com a preferência do sistema.

## Arquitetura

```
src/
├── app/                  Rotas (App Router): lista, nova tarefa, editar tarefa, layout, páginas de erro
│   └── api/trpc/         Endpoint HTTP do tRPC 
├── components/           Interface: TaskList, TaskItem, TaskForm, TaskStats, DebugMenu
├── lib/                  Código compartilhado entre navegador e servidor
│   ├── schemas.ts        Schemas Zod: contrato de validação centralizado
│   ├── mock-tasks.ts     Gerador com seed para as tarefas de debug
│   └── format.ts         Formatação de datas
├── server/
│   ├── routers/          Procedures do tRPC (tasks) e tipo do router principal
│   ├── tasks-store.ts    Store em memória e consultas
│   ├── cursor.ts         Codificação e ordenação do cursor de chave
│   └── caller.ts         Chamadas diretas ao router para Server Components
└── trpc/                 Cliente e provider do React Query + tRPC
tests/e2e/                Specs do Playwright
scripts/e2e.mjs           Sobe o servidor de produção, roda o Playwright e encerra a árvore de processos
docs/THEORY.md            Respostas às questões teóricas
playwright.config.ts      Configuração do Playwright
vitest.config.ts          Configuração do Vitest
```

### Fluxo de requisição

1. A `/` roda no servidor (`force-dynamic`). Ela chama o router diretamente pelo `caller`, então a primeira página de tarefas e as estatísticas já vêm no HTML.
2. Os componentes do cliente recebem esses dados como `initialData`. A partir daí o React Query assume, então não há tela de carregamento na primeira renderização.
3. As mutações passam pelo `httpBatchLink` até `/api/trpc`. Em caso de sucesso, invalidam as queries afetadas. Alternar a conclusão é otimista e é revertido em caso de erro.

## Decisões

- **Validação centralizada.** `src/lib/schemas.ts` é importado tanto pelo router quanto pelos formulários. O servidor é a fonte da verdade; o cliente usa as mesmas regras apenas para dar feedback imediato.
- **Entradas estritas.** Todos os schemas de entrada usam `.strict()`. Campos desconhecidos são rejeitados em vez de ignorados silenciosamente, o que bloqueia mass assignment (por exemplo, enviar `id` ou `createdAt` ao criar uma tarefa).
- **Erros com significado.** Falhas de validação retornam `BAD_REQUEST` com mensagens por campo; tarefas inexistentes retornam `NOT_FOUND`; exceder o limite retorna `TOO_MANY_REQUESTS`. O cliente associa os erros de campo de volta ao formulário.
- **Store em memória em `globalThis`.** Os dados sobrevivem aos hot reloads do Next.js em desenvolvimento.
- **Paginação por chave.** O cursor codifica o `createdAt` e o `id` da última tarefa da página (JSON em base64url, validado no servidor). A próxima página é "tudo depois dessa chave", então excluir ou inserir tarefas durante a rolagem nunca pula nem repete itens. A paginação por offset deslocaria todos os itens após uma mudança. Cursores malformados são rejeitados com `BAD_REQUEST`.
- **Fuso horário fixo (UTC) para datas.** Servidor e navegador renderizam o mesmo texto, evitando divergências.
- **Nomes de campos em inglês.** Os nomes internos estão em inglês (`title`, `description`, `completed`, `createdAt`). Eles correspondem aos campos do enunciado (`titulo`, `descricao`, `dataCriacao`).
- **Ordenação apenas por data.** Ordenar por nome exigiria que o cursor codificasse strings e regras de collation, o que adiciona complexidade com pouco benefício para este escopo. As duas direções reutilizam a mesma chave.
- **Alternância otimista de conclusão.** O cache é atualizado antes da resposta do servidor e revertido em caso de erro. O checkbox também mantém estado local, porque um checkbox controlado volta ao valor anterior se a atualização do cache chegar depois do clique.
- **Capacidade da store.** A store em memória tem limite de 1000 tarefas. Sem esse limite, qualquer cliente poderia fazer o uso de memória do processo crescer sem controle.
- **Ferramentas de debug em produção.** O menu de debug está disponível em todos os ambientes, sem configuração. É um trade-off consciente para uma demonstração, documentado em Segurança.

## Segurança

- **Validação de entrada** em todos os procedures, com limites de tamanho, filtro de caracteres de controle e checagem de UUID para IDs.
- **Mutações só por POST.** O tRPC rejeita mutações via GET.
- **Response headers** definidos em `next.config.ts`: uma Content-Security-Policy que bloqueia origens externas e o uso em frames, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, uma política de referrer restrita e `Cross-Origin-Opener-Policy`. O `X-Powered-By` é removido.
- **Limitação do CSP.** A política permite scripts `'unsafe-inline'`, porque a hidratação do Next.js depende de scripts inline. A opção mais restrita é um nonce por requisição, que exigiria mover decisões de renderização para um middleware.
- **Sem HTML injection.** Títulos e descrições são renderizados como texto pelo React. Os testes verificam que um payload como `<img onerror>` é exibido literalmente e nunca é executado.
- **Os endpoints de debug fazem parte da API pública.** É uma decisão de demonstração. Em um produto real, `generateMock` e `clearAll` ficariam atrás de autenticação e de um papel de administrador.

## Testes

- **Testes unitários (Vitest, 46 testes)** cobrem:
  - Schemas: limites de tamanho, caracteres de controle, trim, coerção de entradas do formulário e do menu de debug.
  - Router: todos os caminhos de rejeição (entrada inválida, mass assignment, IDs inexistentes, cursores malformados), regras de negócio, filtragem, comportamento de cópia na leitura e as operações de debug.
  - Paginação: cada tarefa retornada exatamente uma vez entre as páginas, resultados estáveis quando uma tarefa é excluída ou inserida entre páginas, filtros combinados com cursores, as duas direções de ordenação e o cursor da última página.
  - Gerador de dados: saída determinística para a mesma seed, saída válida para cada tarefa e intervalo de datas.
- **Testes end-to-end (Playwright)** rodam usando o build de produção no Chromium. `npm run test:e2e` faz o build primeiro, depois o `scripts/e2e.mjs` sobe o servidor e encerra a árvore de processos inteira ao fim da execução. A opção `webServer` do próprio Playwright deixava o processo do Next rodando no Windows, então o script cuida do encerramento diretamente. Eles cobrem:
  - Conteúdo SSR no HTML inicial e cabeçalhos de segurança.
  - Comportamento da API vista de fora (mass assignment, IDs inválidos, mutações via GET).
  - Criar, validar, editar, concluir, buscar, filtrar, ordenar e excluir tarefas, incluindo a etapa de confirmação.
  - Geração de debug, rolagem infinita (a próxima página carrega quando a lista chega ao fim), a página 404 e a renderização de payloads HTML como texto.

## Stack

- Next.js 15 (App Router)
- React 19
- tRPC 11
- TanStack React Query 5
- Zod 3
- React Hook Form
- superjson
- Tailwind CSS 4
- Sonner
- Lucide
- Vitest
- Playwright
