# deploy-helper — Agent Instructions

> **Repositórios analisados são estritamente somente leitura.**
> Nunca modifique, crie ou exclua arquivos em repositórios externos apontados via `--repo`. Apenas leia e analise — toda escrita deve ocorrer exclusivamente dentro deste projeto (`deploy-helper`).

CLI toolkit that analyzes Git diffs between branches and uses AI (Claude or GitHub Copilot) to generate **GMUD** (Gerenciamento de Mudança Urgente e Dimensionada) documents.

## Architecture

```
bin/deploy-helper.js   ← CLI entry point (Commander.js)
src/
  analyzer.js          ← git diff + file classification
  detector.js          ← stack detection (language/framework)
  agents.js            ← agent loader with fallback chain
  gmud.js              ← prompt builder + AI call
  patterns.js          ← regex patterns for file categorization
  cache.js             ← SHA256-keyed persistent cache in cache/
  server.js            ← Express GUI + REST API
  ai/
    claude.js           ← Anthropic SDK
    copilot.js          ← GitHub Models (Azure)
    claude-cli.js       ← Local Claude CLI (OAuth)
agents/
  generic/             ← fallback agents for any stack
  javascript/node/
  javascript/react/
  php/laravel/
  python/django/       ← stub, needs implementation
```

## Build & Test

```bash
npm test              # jest --coverage
npm run test:watch    # jest --watch
node bin/deploy-helper.js gmud --help
```

Requires `ANTHROPIC_API_KEY` or `GITHUB_TOKEN` set in environment.

## Key Conventions

### Module exports
All modules use named exports: `module.exports = { functionName }`.

### Agent fallback chain
`agents.js` loads agents in order: `agents/[lang]/[framework]/` → `agents/[lang]/generic/` → `agents/generic/`. Add new stacks by creating `agents/[lang]/[framework]/` following the generic template.

### Agent structure
Each agent type (`BackendReviewer`, `FrontendReviewer`, `ProductReviewer`) exports `buildPrompt(analysis, stack)`. Specific agents extend the generic base:
```javascript
const { buildPrompt: genericPrompt } = require('../../generic/BackendReviewer');
function buildPrompt(analysis, stack) {
  return genericPrompt(analysis, stack) + frameworkSpecificContext;
}
```

### File classification categories
`patterns.js` classifies files into: `env`, `migration`, `seeder`, `vulnerability`, `critical`. Extend these arrays when adding new detection patterns.

### AI provider interface
All providers in `src/ai/` expose `generateWith*()` and support `options.onChunk()` for streaming. Keep this interface consistent when adding providers.

### Cache
`cache.js` uses SHA256 of `repoPath` as key. Cache files live in `cache/` and are gitignored (check `.gitignore` if adding new cache strategies).

## Core Data Shape

`analyzeBranches()` returns:
```javascript
{
  fromBranch, toBranch,
  totalFiles, insertions, deletions,
  files: [{ file, insertions, deletions, binary, categories[] }],
  summary: { env[], migration[], seeder[], vulnerability[], critical[], changed[] }
}
```

## Common Tasks

- **Add a new stack**: create `agents/[lang]/[framework]/{BackendReviewer,FrontendReviewer,ProductReviewer}.js` following [agents/php/laravel/BackendReviewer.js](agents/php/laravel/BackendReviewer.js)
- **Add a file detection pattern**: edit the regex arrays in [src/patterns.js](src/patterns.js)
- **Add a new AI provider**: add `src/ai/[provider].js`, wire it in [src/gmud.js](src/gmud.js) and [bin/deploy-helper.js](bin/deploy-helper.js)
- **Extend GMUD output**: modify `buildPrompt` in [src/gmud.js](src/gmud.js)

See [README.md](README.md) for CLI usage and options.
