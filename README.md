# deploy-helper

A CLI toolkit that uses AI (Claude or GitHub Copilot) to generate **GMUD** (Gerenciamento de Mudança Urgente e Dimensionada) documents during deploy processes.

> **Analyzed repositories are strictly read-only.** deploy-helper never modifies, creates, or deletes files in external repositories. It only reads the git diff and generates a report.

## Features

- 🔍 **Branch comparison** – Analyze differences between any two branches (default: `homolog` → `master`)
- 🗃️ **Smart classification** – Automatically detects:
  - New/changed environment variables (reported in the GMUD, never modified)
  - Database migrations
  - Database seeders
  - Dependency/vulnerability risk files
  - Critical infrastructure changes (Docker, CI/CD, Kubernetes, Terraform, etc.)
- 🤖 **AI-powered GMUD generation** – Uses Claude (Anthropic) or GitHub Copilot (GitHub Models) to produce a complete change-management document
- 🌐 **Web GUI** – Visual interface to select repository, branches, and agents (`deploy-helper gui`)
- 📄 **Markdown output** – Save directly to a file or print to stdout

## Installation

```bash
npm install -g deploy-helper
```

Or use directly with `npx`:

```bash
npx deploy-helper gmud
```

## Requirements

Choose **one** of the following AI providers:

| Provider | Environment Variable |
|---|---|
| Claude (Anthropic) | `ANTHROPIC_API_KEY` |
| GitHub Copilot (GitHub Models) | `GITHUB_TOKEN` |

## Usage

### Launch the web GUI

```bash
# Open the GUI in your browser (default port 3131)
deploy-helper gui

# Or using npx (without global install)
npx deploy-helper gui

# Pre-fill a repository path
deploy-helper gui --repo /path/to/your/repo

# Use a custom port
deploy-helper gui --port 8080

# Start without opening the browser automatically
deploy-helper gui --no-open
```

### Generate a GMUD document

```bash
# Using Claude (default provider), comparing homolog → master
deploy-helper gmud

# Using GitHub Copilot
deploy-helper gmud --provider copilot

# Custom branches
deploy-helper gmud --from develop --to main

# Save output to a file
deploy-helper gmud --output gmud.md

# Use a specific model
deploy-helper gmud --provider claude --model claude-3-5-sonnet-20241022

# Point to a different repository
deploy-helper gmud --repo /path/to/your/repo
```

### Analyze without generating (dry-run)

```bash
# Human-readable output
deploy-helper analyze --from homolog --to master

# JSON output
deploy-helper analyze --json
```

### All options

```
deploy-helper gui [options]

  -p, --port <number>      Port for the web server (default: 3131)
  -r, --repo <path>        Pre-fill repository path in the GUI
  --no-open                Do not open the browser automatically

deploy-helper gmud [options]

  -f, --from <branch>      Source branch (default: "homolog")
  -t, --to <branch>        Target branch (default: "master")
  -r, --repo <path>        Path to git repository (default: current dir)
  -p, --provider <name>    AI provider: claude | copilot (default: "claude")
  -m, --model <model>      AI model override
  -o, --output <file>      Write GMUD to this file instead of stdout
  --max-tokens <number>    Maximum tokens for AI response

deploy-helper analyze [options]

  -f, --from <branch>      Source branch (default: "homolog")
  -t, --to <branch>        Target branch (default: "master")
  -r, --repo <path>        Path to git repository (default: current dir)
  --json                   Output analysis as JSON
```

## GMUD Document Structure

The generated GMUD document contains:

1. **Change Description** – What is being deployed and why
2. **Impact Assessment** – Which systems/services are affected
3. **Risk Analysis** – Risks and vulnerabilities identified
4. **Rollback Plan** – How to revert if something goes wrong
5. **Deploy Checklist** – Step-by-step deployment checklist including env updates, migrations, seeders
6. **Post-Deploy Validation** – How to verify the deploy succeeded

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test
```

