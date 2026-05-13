'use strict';

const simpleGit = require('simple-git');
const { classifyFile } = require('./patterns');

/**
 * Analyzes git diff between two branches and classifies changed files.
 * @param {string} repoPath - Path to the git repository
 * @param {string} fromBranch - Source branch (e.g. 'homolog')
 * @param {string} toBranch - Target branch (e.g. 'master')
 * @returns {Promise<AnalysisResult>}
 */
async function analyzeBranches(repoPath, fromBranch, toBranch, { onProgress } = {}) {
  const progress = (step, message, status = 'done', cmd = null) => {
    if (typeof onProgress === 'function') onProgress({ step, message, status, cmd });
  };

  const git = simpleGit(repoPath);

  progress('fetch', 'Buscando refs remotas...', 'running', 'git fetch --all');
  try {
    await git.fetch(['--all']);
    progress('fetch', 'Refs remotas atualizadas', 'done', 'git fetch --all');
  } catch {
    progress('fetch', 'Sem remote configurado — usando refs locais', 'skip', 'git fetch --all');
  }

  // Resolve each branch: prefer local name, fall back to origin/name
  async function resolveRef(name) {
    for (const candidate of [name, `origin/${name}`]) {
      try {
        await git.revparse(['--verify', candidate]);
        return candidate;
      } catch {
        // try next
      }
    }
    return null;
  }

  progress('resolve', `Verificando branch "${fromBranch}"...`, 'running', `git rev-parse --verify ${fromBranch}`);
  const resolvedFrom = await resolveRef(fromBranch);
  if (!resolvedFrom) {
    const err = new Error(`Branch "${fromBranch}" não encontrada no repositório. Verifique o nome ou execute git fetch.`);
    err.statusCode = 400;
    throw err;
  }
  progress('resolve_from', `Branch "${fromBranch}" → ${resolvedFrom}`, 'done', `git rev-parse --verify ${resolvedFrom}`);

  progress('resolve_to', `Verificando branch "${toBranch}"...`, 'running', `git rev-parse --verify ${toBranch}`);
  const resolvedTo = await resolveRef(toBranch);
  if (!resolvedTo) {
    const err = new Error(`Branch "${toBranch}" não encontrada no repositório. Verifique o nome ou execute git fetch.`);
    err.statusCode = 400;
    throw err;
  }
  progress('resolve_to', `Branch "${toBranch}" → ${resolvedTo}`, 'done', `git rev-parse --verify ${resolvedTo}`);

  // Use toBranch...fromBranch so "from homologacao to master" shows what
  // homologacao has that master doesn't (i.e., changes to be deployed).
  const diffRange = `${resolvedTo}...${resolvedFrom}`;
  progress('diff', `Calculando diff entre branches...`, 'running', `git diff --stat ${diffRange}`);
  const diffSummary = await git.diffSummary([diffRange]);
  const diffOutput = await git.diff([diffRange]);
  progress('diff', `${diffSummary.files.length} arquivo(s) alterado(s) (+${diffSummary.insertions}/−${diffSummary.deletions})`, 'done', `git diff ${diffRange}`);

  const result = {
    fromBranch,
    toBranch,
    totalFiles: diffSummary.files.length,
    insertions: diffSummary.insertions,
    deletions: diffSummary.deletions,
    files: [],
    categories: {
      env: [],
      migration: [],
      seeder: [],
      vulnerability: [],
      critical: [],
      other: [],
    },
    diff: diffOutput,
  };

  progress('classify', 'Classificando arquivos alterados...', 'running');

  for (const file of diffSummary.files) {
    const filePath = file.file;
    const categories = classifyFile(filePath);

    const fileEntry = {
      file: filePath,
      insertions: file.insertions,
      deletions: file.deletions,
      binary: file.binary || false,
      categories,
    };

    result.files.push(fileEntry);

    if (categories.length === 0) {
      result.categories.other.push(filePath);
    } else {
      for (const cat of categories) {
        result.categories[cat].push(filePath);
      }
    }
  }

  progress('classify', 'Arquivos classificados', 'done');

  return result;
}

module.exports = { analyzeBranches };
