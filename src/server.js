'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { analyzeBranches } = require('./analyzer');
const { generateGmud } = require('./gmud');
const { isCliAvailable, generateWithClaudeCli } = require('./ai/claude-cli');
const { detectStack, recommendAgents } = require('./detector');
const {
  readCache,
  writeCache,
  clearCache,
  listCache,
  readRepositoriesCache,
  writeRepositoriesCache,
} = require('./cache');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'gui')));

const APP_ROOT = path.resolve(__dirname, '..');
const DEFAULT_REPOSITORIES_BASE_PATH = path.resolve(APP_ROOT, '..');

// ─── Helper ────────────────────────────────────────────────────────────────

function sanitizeRepoPath(repoPath) {
  if (!repoPath || typeof repoPath !== 'string') throw new Error('repoPath is required');
  const resolved = path.resolve(repoPath);
  if (!fs.existsSync(resolved)) throw new Error(`Repository path not found: ${resolved}`);
  return resolved;
}

function listRepositoriesOneLevel(basePath) {
  const normalizedBase = path.resolve(basePath);
  if (!fs.existsSync(normalizedBase)) {
    throw new Error(`Base path not found: ${normalizedBase}`);
  }

  const entries = fs.readdirSync(normalizedBase, { withFileTypes: true });
  const repositories = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;

    const repoPath = path.join(normalizedBase, entry.name);
    const gitDir = path.join(repoPath, '.git');
    if (fs.existsSync(gitDir)) {
      repositories.push(repoPath);
    }
  }

  repositories.sort((a, b) => a.localeCompare(b));
  return repositories;
}

function parseEnvMap(content) {
  const map = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    map[match[1]] = match[2];
  }
  return map;
}

function parseEnvTemplate(content) {
  const keys = [];
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    keys.push({ key: match[1], defaultValue: match[2] });
  }
  return keys;
}

// ─── Routes ────────────────────────────────────────────────────────────────

/**
 * GET /
 * Serve the GUI
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'gui', 'index.html'));
});

/**
 * GET /api/repositories
 * List git repositories found one level below the base path.
 */
app.get('/api/repositories', (req, res) => {
  try {
    const basePath = req.query.basePath ? path.resolve(String(req.query.basePath)) : DEFAULT_REPOSITORIES_BASE_PATH;
    const rescan = req.query.rescan === '1' || req.query.rescan === 'true';

    if (!rescan) {
      const cached = readRepositoriesCache(basePath);
      if (cached) {
        return res.json({
          success: true,
          basePath,
          repositories: cached.repositories,
          cached: true,
          updatedAt: cached.updatedAt,
        });
      }
    }

    const repositories = listRepositoriesOneLevel(basePath);
    const cacheEntry = writeRepositoriesCache(basePath, repositories);

    return res.json({
      success: true,
      basePath,
      repositories,
      cached: false,
      updatedAt: cacheEntry.updatedAt,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/detect
 * Detect language/framework and recommend agents.
 */
app.post('/api/detect', (req, res) => {
  try {
    const repoPath = sanitizeRepoPath(req.body.repoPath);
    const stack = detectStack(repoPath);

    // Cache the detection result
    writeCache(repoPath, { stack });

    res.json({ success: true, repoPath, stack });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/analyze
 * Run branch comparison and file analysis.
 */
app.post('/api/analyze', async (req, res) => {
  // Validate early — before switching to SSE so errors can be JSON
  let repoPath, from, to;
  try {
    repoPath = sanitizeRepoPath(req.body.repoPath);
    from = req.body.from || 'homolog';
    to = req.body.to || 'master';
    if (typeof from !== 'string' || typeof to !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid branch names' });
    }
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }

  // Switch to SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const analysis = await analyzeBranches(repoPath, from, to, {
      onProgress: (p) => send('progress', p),
    });

    send('progress', { step: 'stack', message: 'Detectando stack e recomendações...', status: 'running' });
    const cached = readCache(repoPath) || {};
    const stack = cached.stack || detectStack(repoPath);
    const recommendations = recommendAgents(stack, analysis);
    writeCache(repoPath, { lastFrom: from, lastTo: to, stack, recommendations });
    send('progress', { step: 'stack', message: `Stack: ${stack.language}/${stack.framework} (confiança: ${stack.confidence})`, status: 'done' });

    const sensitiveFiles = [
      ...analysis.categories.env,
      ...analysis.categories.critical,
      ...analysis.categories.vulnerability,
    ];

    send('done', {
      success: true,
      analysis: { ...analysis, diff: undefined },
      diff: analysis.diff,
      sensitiveFiles,
      stack,
      recommendations,
    });
  } catch (err) {
    send('error', { error: err.message });
  }

  res.end();
});

app.post('/api/env/status', (req, res) => {
  try {
    const repoPath = sanitizeRepoPath(req.body.repoPath);
    const envPath = path.join(repoPath, '.env');
    const envExamplePath = path.join(repoPath, '.env.example');

    const envExists = fs.existsSync(envPath);
    const hasExample = fs.existsSync(envExamplePath);

    const currentMap = envExists ? parseEnvMap(fs.readFileSync(envPath, 'utf-8')) : {};
    const templateEntries = hasExample ? parseEnvTemplate(fs.readFileSync(envExamplePath, 'utf-8')) : [];

    const missingKeys = templateEntries
      .map((entry) => entry.key)
      .filter((key) => !currentMap[key] || currentMap[key].trim() === '');

    const configured = hasExample ? envExists && missingKeys.length === 0 : envExists;

    res.json({
      success: true,
      configured,
      envExists,
      hasExample,
      missingKeys,
      entries: templateEntries.map((entry) => ({
        key: entry.key,
        defaultValue: entry.defaultValue,
        currentValue: currentMap[entry.key] || '',
      })),
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/env/configure
 * Create/update .env using provided values and .env.example as key source.
 */
app.post('/api/env/configure', (req, res) => {
  try {
    const repoPath = sanitizeRepoPath(req.body.repoPath);
    const values = req.body.values && typeof req.body.values === 'object' ? req.body.values : {};

    const envPath = path.join(repoPath, '.env');
    const envExamplePath = path.join(repoPath, '.env.example');

    const envExists = fs.existsSync(envPath);
    const hasExample = fs.existsSync(envExamplePath);

    const currentMap = envExists ? parseEnvMap(fs.readFileSync(envPath, 'utf-8')) : {};
    const templateEntries = hasExample ? parseEnvTemplate(fs.readFileSync(envExamplePath, 'utf-8')) : [];

    const keyEntries = templateEntries.length > 0
      ? templateEntries
      : Object.keys(values).sort().map((key) => ({ key, defaultValue: '' }));

    const lines = keyEntries.map((entry) => {
      const value = Object.prototype.hasOwnProperty.call(values, entry.key)
        ? String(values[entry.key])
        : (currentMap[entry.key] || entry.defaultValue || '');
      return `${entry.key}=${value}`;
    });

    fs.writeFileSync(envPath, `${lines.join('\n')}\n`, 'utf-8');
    res.json({ success: true, envPath });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/providers
 * Returns which AI providers are available based on env vars.
 */
app.get('/api/providers', (req, res) => {
  const claudeApi = !!process.env.ANTHROPIC_API_KEY;
  const claudeCli = isCliAvailable();
  const claude = claudeApi || claudeCli;
  const copilot = !!process.env.GITHUB_TOKEN;
  res.json({
    claude,
    claudeApi,
    claudeCli,
    copilot,
    recommended: claude ? 'claude' : copilot ? 'copilot' : null,
  });
});

/**
 * POST /api/gmud/stream
 * Generate GMUD via SSE streaming.
 */
app.post('/api/gmud/stream', async (req, res) => {
  try {
    const { analysis, provider, model, agentType, maxTokens, stack } = req.body;

    if (!analysis) return res.status(400).json({ success: false, error: 'analysis is required' });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Auto-fallback: claude API → claude CLI → copilot
    let effectiveProvider = provider || 'claude';
    if (effectiveProvider === 'claude' && !process.env.ANTHROPIC_API_KEY) {
      if (isCliAvailable()) {
        effectiveProvider = 'claude-cli';
        send('info', { message: 'ANTHROPIC_API_KEY não configurada — usando Claude Code CLI (autenticação local)' });
      } else if (process.env.GITHUB_TOKEN) {
        effectiveProvider = 'copilot';
        send('info', { message: 'ANTHROPIC_API_KEY não configurada — usando GitHub Copilot (GPT-4o)' });
      } else {
        res.write(`event: error\ndata: ${JSON.stringify({ error: 'Nenhum provider disponível. Configure ANTHROPIC_API_KEY, instale o Claude Code CLI, ou configure GITHUB_TOKEN.' })}\n\n`);
        return res.end();
      }
    }

    send('start', { message: 'Starting GMUD generation...' });

    let fullContent = '';

    const onChunk = (chunk) => { fullContent += chunk; send('chunk', { text: chunk }); };

    if (effectiveProvider === 'claude-cli') {
      const { buildAgentPrompt } = require('./agents');
      const prompt = buildAgentPrompt(analysis, stack, agentType);
      await generateWithClaudeCli(prompt, { model, onChunk });
    } else {
      await generateGmud(analysis, {
        provider: effectiveProvider,
        model,
        maxTokens: maxTokens ? parseInt(maxTokens, 10) : undefined,
        agentType,
        stack,
        onChunk,
      });
    }

    send('done', { content: fullContent });
    res.end();
  } catch (err) {
    try {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
    } catch { /* ignore write errors */ }
    res.end();
  }
});

/**
 * GET /api/cache
 * List all cached repository entries.
 */
app.get('/api/cache', (req, res) => {
  res.json({ success: true, entries: listCache() });
});

/**
 * POST /api/favorite
 * Toggle favorite status for a repository.
 */
app.post('/api/favorite', (req, res) => {
  try {
    const repoPath = sanitizeRepoPath(req.body.repoPath);
    const { favorited } = req.body;
    const updated = writeCache(repoPath, { favorited: !!favorited });
    res.json({ success: true, favorited: updated.favorited });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/cache
 * Clear cache for a specific repo.
 */
app.delete('/api/cache', (req, res) => {
  try {
    const repoPath = sanitizeRepoPath(req.body.repoPath);
    clearCache(repoPath);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Keep API responses JSON-only, even for unknown routes or unexpected errors.
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: `API route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  if (req.path && req.path.startsWith('/api/')) {
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
  return next(err);
});

/**
 * Start the GUI server.
 * @param {number} [port=3131]
 * @returns {Promise<import('http').Server>}
 */
function startServer(port = 3131) {
  return new Promise((resolve) => {
    const server = app.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

module.exports = { startServer };
