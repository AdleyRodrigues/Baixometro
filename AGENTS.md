# Diretrizes para Agentes de IA — Baixômetro

## Regra Global: Economia de Tokens com Graphify

> **SEMPRE** que precisar analisar o código, entender dependências ou procurar onde uma função/struct está implementada, **CONSULTE PRIMEIRO O GRAFO** gerado pelo Graphify (`python -m graphify query "<termo>"` ou `python -m graphify update .` quando houver novos arquivos). Não leia arquivos inteiros ou faça `grep` recursivo no projeto sem antes consultar o grafo para encontrar os nós relevantes. Isso é obrigatório para economizar tokens e acelerar as respostas.

### Comandos Rápidos do Graphify
- **Atualizar o grafo após mudanças:** `python -m graphify update .`
- **Consultar nós e relações (BFS):** `python -m graphify query "<termos>"`
- **Caminho entre dois símbolos:** `python -m graphify path "<Origem>" "<Destino>"`
- **Explicar um nó específico:** `python -m graphify explain "<No>"`

## Regras de Qualidade e Fluxo de Trabalho
1. **Lint e Build obrigatórios:** Ao final de cada implementação, execute `cargo fmt --check`, `cargo build` (via container `baixometro-api`), `pnpm lint` e `pnpm build`.
2. **Validação no navegador:** Utilize o MCP do Chrome DevTools (`chrome-devtools-mcp`) para inspecionar o console e garantir ausência de erros em runtime.
3. **Controle de commits:** Nunca faça `git commit` automaticamente sem autorização explícita do usuário; mostre o `git status` ao final e aguarde revisão.
4. **Informar portas ativas:** Sempre informe claramente em quais portas e URLs o Frontend e o Backend estão rodando ao final das respostas.
5. **Formatação de Types TypeScript:** Sempre que declarar, editar ou gerar `types`/`interfaces` (especialmente em `packages/shared-types` e no frontend), adote organização vertical multi-linha (1 campo por linha, 2 espaços de indentação, vírgula no final e sem comentário de cabeçalho do `ts-rs`):
   ```ts
   export type Category = {
     id: string,
     name: string,
     color: string,
     icon: string,
   };
   ```


