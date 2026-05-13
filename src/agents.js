'use strict';

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '..', 'agents');

/**
 * Load an agent module by type, language, and framework.
 * Falls back to generic agent if no specific one exists.
 *
 * @param {string} language - e.g. 'javascript', 'php'
 * @param {string} framework - e.g. 'react', 'laravel'
 * @param {'FrontendReviewer'|'BackendReviewer'|'ProductReviewer'} agentType
 * @returns {object} Agent module with buildPrompt(analysis, stack) function
 */
function loadAgent(language, framework, agentType) {
  const candidates = [
    path.join(AGENTS_DIR, language, framework, `${agentType}.js`),
    path.join(AGENTS_DIR, language, 'generic', `${agentType}.js`),
    path.join(AGENTS_DIR, 'generic', `${agentType}.js`),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return require(candidate);
    }
  }

  throw new Error(`No agent found for type "${agentType}" (language: ${language}, framework: ${framework})`);
}

/**
 * Build the AI prompt using the appropriate agent.
 * Supports a single agentType string or an array for multi-agent selection.
 *
 * @param {object} analysis - Result from analyzeBranches
 * @param {object} stack - { language, framework, confidence }
 * @param {string|string[]} agentType
 * @returns {string}
 */
function buildAgentPrompt(analysis, stack, agentType) {
  const types = Array.isArray(agentType) ? agentType : [agentType];

  const prompts = types.map((type) => {
    const agent = loadAgent(stack.language || 'generic', stack.framework || 'generic', type);
    return { type, prompt: agent.buildPrompt(analysis, stack) };
  });

  if (prompts.length === 1) return prompts[0].prompt;

  // Multi-agent: use first as primary base, append specific-context sections from others
  const [primary, ...rest] = prompts;
  const extras = rest.map(({ type, prompt }) => {
    // Extract everything after the first blank line (skip role/summary boilerplate already in primary)
    const afterSummary = prompt.split(/\n## /m).slice(2).map((s) => `## ${s}`).join('\n');
    return `\n\n---\n\n<!-- Additional perspective: ${type} -->\n${afterSummary}`;
  });

  return primary.prompt + extras.join('');
}

/**
 * List available agent types for a given stack.
 * @param {string} language
 * @param {string} framework
 * @returns {string[]} Available agent type names
 */
function listAvailableAgents(language, framework) {
  const types = ['FrontendReviewer', 'BackendReviewer', 'ProductReviewer'];
  return types.filter((type) => {
    const candidates = [
      path.join(AGENTS_DIR, language, framework, `${type}.js`),
      path.join(AGENTS_DIR, language, 'generic', `${type}.js`),
      path.join(AGENTS_DIR, 'generic', `${type}.js`),
    ];
    return candidates.some((c) => fs.existsSync(c));
  });
}

module.exports = { loadAgent, buildAgentPrompt, listAvailableAgents };
