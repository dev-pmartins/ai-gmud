'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Detects the primary language and framework of a repository.
 * @param {string} repoPath - Absolute path to the repository
 * @returns {{ language: string, framework: string, confidence: 'high'|'medium'|'low' }}
 */
function detectStack(repoPath) {
  const exists = (file) => fs.existsSync(path.join(repoPath, file));
  const read = (file) => fs.readFileSync(path.join(repoPath, file), 'utf-8');

  // PHP (check before JS since some projects have both)
  if (exists('composer.json')) {
    try {
      const result = detectPhp(read('composer.json'));
      if (result) return result;
    } catch { /* skip */ }
  }

  // JavaScript / TypeScript
  if (exists('package.json')) {
    try {
      const result = detectJavaScript(read('package.json'));
      if (result) return result;
    } catch { /* skip */ }
  }

  // Python
  if (exists('requirements.txt') || exists('Pipfile') || exists('pyproject.toml')) {
    const result = detectPython(repoPath, exists, read);
    if (result) return result;
  }

  // Java / Kotlin
  if (exists('pom.xml')) {
    try {
      return detectJava(read('pom.xml'));
    } catch { /* skip */ }
  }
  if (exists('build.gradle') || exists('build.gradle.kts')) {
    try {
      const file = exists('build.gradle') ? 'build.gradle' : 'build.gradle.kts';
      return detectJava(read(file));
    } catch { /* skip */ }
  }

  // Go
  if (exists('go.mod')) {
    try {
      return detectGo(read('go.mod'));
    } catch { /* skip */ }
  }

  // Rust
  if (exists('Cargo.toml')) {
    try {
      return detectRust(read('Cargo.toml'));
    } catch { /* skip */ }
  }

  // Ruby
  if (exists('Gemfile')) {
    try {
      return detectRuby(read('Gemfile'));
    } catch { /* skip */ }
  }

  return { language: 'generic', framework: 'generic', confidence: 'low' };
}

function detectPhp(content) {
  const pkg = JSON.parse(content);
  const require = { ...(pkg.require || {}), ...(pkg['require-dev'] || {}) };

  if (require['laravel/framework'] || require['laravel/lumen-framework']) {
    return { language: 'php', framework: 'laravel', confidence: 'high' };
  }
  if (require['symfony/symfony'] || require['symfony/framework-bundle']) {
    return { language: 'php', framework: 'symfony', confidence: 'high' };
  }
  if (require['cakephp/cakephp']) {
    return { language: 'php', framework: 'cakephp', confidence: 'high' };
  }
  if (require['slim/slim']) {
    return { language: 'php', framework: 'slim', confidence: 'high' };
  }
  return { language: 'php', framework: 'generic', confidence: 'medium' };
}

function detectJavaScript(content) {
  const pkg = JSON.parse(content);
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  // Frontend frameworks
  if (deps['next']) return { language: 'javascript', framework: 'nextjs', confidence: 'high' };
  if (deps['nuxt'] || deps['nuxt3']) return { language: 'javascript', framework: 'nuxt', confidence: 'high' };
  if (deps['react']) return { language: 'javascript', framework: 'react', confidence: 'high' };
  if (deps['vue']) return { language: 'javascript', framework: 'vue', confidence: 'high' };
  if (deps['@angular/core']) return { language: 'javascript', framework: 'angular', confidence: 'high' };
  if (deps['svelte']) return { language: 'javascript', framework: 'svelte', confidence: 'high' };

  // Backend frameworks
  if (deps['@nestjs/core']) return { language: 'javascript', framework: 'nestjs', confidence: 'high' };
  if (deps['fastify']) return { language: 'javascript', framework: 'fastify', confidence: 'high' };
  if (deps['koa']) return { language: 'javascript', framework: 'koa', confidence: 'high' };
  if (deps['hapi'] || deps['@hapi/hapi']) return { language: 'javascript', framework: 'hapi', confidence: 'high' };
  if (deps['express']) return { language: 'javascript', framework: 'node', confidence: 'high' };

  return { language: 'javascript', framework: 'node', confidence: 'medium' };
}

function detectPython(repoPath, exists, read) {
  // Check requirements.txt first
  if (exists('requirements.txt')) {
    try {
      const req = read('requirements.txt').toLowerCase();
      if (req.includes('django')) return { language: 'python', framework: 'django', confidence: 'high' };
      if (req.includes('flask')) return { language: 'python', framework: 'flask', confidence: 'high' };
      if (req.includes('fastapi')) return { language: 'python', framework: 'fastapi', confidence: 'high' };
    } catch { /* skip */ }
  }

  // Check pyproject.toml
  if (exists('pyproject.toml')) {
    try {
      const content = read('pyproject.toml').toLowerCase();
      if (content.includes('django')) return { language: 'python', framework: 'django', confidence: 'high' };
      if (content.includes('flask')) return { language: 'python', framework: 'flask', confidence: 'high' };
      if (content.includes('fastapi')) return { language: 'python', framework: 'fastapi', confidence: 'high' };
    } catch { /* skip */ }
  }

  // Detect Django by manage.py
  if (exists('manage.py')) return { language: 'python', framework: 'django', confidence: 'medium' };

  return { language: 'python', framework: 'generic', confidence: 'medium' };
}

function detectJava(content) {
  if (content.includes('spring-boot') || content.includes('org.springframework')) {
    return { language: 'java', framework: 'spring', confidence: 'high' };
  }
  if (content.includes('quarkus')) return { language: 'java', framework: 'quarkus', confidence: 'high' };
  if (content.includes('micronaut')) return { language: 'java', framework: 'micronaut', confidence: 'high' };
  return { language: 'java', framework: 'generic', confidence: 'medium' };
}

function detectGo(content) {
  if (content.includes('gin-gonic/gin')) return { language: 'go', framework: 'gin', confidence: 'high' };
  if (content.includes('labstack/echo')) return { language: 'go', framework: 'echo', confidence: 'high' };
  if (content.includes('gorilla/mux')) return { language: 'go', framework: 'gorilla', confidence: 'high' };
  if (content.includes('gofiber/fiber')) return { language: 'go', framework: 'fiber', confidence: 'high' };
  return { language: 'go', framework: 'generic', confidence: 'medium' };
}

function detectRust(content) {
  if (content.includes('actix-web')) return { language: 'rust', framework: 'actix', confidence: 'high' };
  if (content.includes('rocket')) return { language: 'rust', framework: 'rocket', confidence: 'high' };
  if (content.includes('axum')) return { language: 'rust', framework: 'axum', confidence: 'high' };
  return { language: 'rust', framework: 'generic', confidence: 'medium' };
}

function detectRuby(content) {
  if (content.includes("'rails'") || content.includes('"rails"')) {
    return { language: 'ruby', framework: 'rails', confidence: 'high' };
  }
  if (content.includes("'sinatra'") || content.includes('"sinatra"')) {
    return { language: 'ruby', framework: 'sinatra', confidence: 'high' };
  }
  return { language: 'ruby', framework: 'generic', confidence: 'medium' };
}

/**
 * Recommend reviewer agents based on detected stack and analysis results.
 * @param {object} stack - { language, framework, confidence }
 * @param {object} analysis - Result from analyzeBranches
 * @returns {Array<{ type: string, priority: 'high'|'medium', reason: string }>}
 */
function recommendAgents(stack, analysis) {
  const agents = [];
  const files = analysis.files.map((f) => f.file.toLowerCase());

  const hasFrontend = files.some((f) =>
    f.match(/\.(tsx?|jsx?|vue|svelte|css|scss|sass|less|html?)$/) ||
    f.includes('/component') ||
    f.includes('/view') ||
    f.includes('/template') ||
    f.includes('/page') ||
    f.includes('/layout') ||
    f.includes('/assets') ||
    f.includes('/public')
  );

  const hasBackend = files.some((f) =>
    f.includes('/controller') ||
    f.includes('/service') ||
    f.includes('/repository') ||
    f.includes('/api/') ||
    f.includes('/routes') ||
    f.includes('/middleware') ||
    f.includes('/handler') ||
    f.includes('/provider') ||
    f.match(/\.(sql)$/)
  );

  const hasDb =
    analysis.categories.migration.length > 0 ||
    analysis.categories.seeder.length > 0;

  const hasSecurity =
    analysis.categories.critical.length > 0 ||
    analysis.categories.vulnerability.length > 0 ||
    analysis.categories.env.length > 0;

  // ProductReviewer is always useful
  agents.push({
    type: 'ProductReviewer',
    priority: 'medium',
    reason: 'Provides a product-level overview of all changes',
  });

  const frontendFrameworks = ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt'];
  if (hasFrontend || frontendFrameworks.includes(stack.framework)) {
    agents.push({
      type: 'FrontendReviewer',
      priority: 'high',
      reason: 'Frontend files detected in diff',
    });
  }

  const backendFrameworks = ['laravel', 'symfony', 'node', 'nestjs', 'fastify', 'django', 'flask', 'fastapi', 'spring', 'rails'];
  if (hasBackend || hasDb || hasSecurity || backendFrameworks.includes(stack.framework)) {
    agents.push({
      type: 'BackendReviewer',
      priority: 'high',
      reason: hasDb ? 'Database changes detected' : hasSecurity ? 'Security-sensitive changes detected' : 'Backend files detected in diff',
    });
  }

  return agents;
}

module.exports = { detectStack, recommendAgents };
