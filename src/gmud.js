'use strict';

const { generateWithClaude } = require('./ai/claude');
const { generateWithCopilot } = require('./ai/copilot');

/**
 * Build the GMUD prompt from an analysis result.
 * @param {object} analysis - Result from analyzeBranches
 * @returns {string}
 */
function buildPrompt(analysis) {
  const { fromBranch, toBranch, totalFiles, insertions, deletions, categories, diff } = analysis;

  const sections = [];

  sections.push(`You are a technical writer specialized in IT change management documentation.`);
  sections.push(
    `Generate a GMUD (Gerenciamento de Mudança Urgente e Dimensionada) document in Markdown format for the following deployment.`
  );
  sections.push('');
  sections.push(`## Deployment Summary`);
  sections.push(`- **Source branch:** ${fromBranch}`);
  sections.push(`- **Target branch:** ${toBranch}`);
  sections.push(`- **Total files changed:** ${totalFiles}`);
  sections.push(`- **Lines added:** ${insertions}`);
  sections.push(`- **Lines removed:** ${deletions}`);

  if (categories.env.length > 0) {
    sections.push('');
    sections.push(`## New / Changed Environment Variables`);
    sections.push(categories.env.map((f) => `- \`${f}\``).join('\n'));
  }

  if (categories.migration.length > 0) {
    sections.push('');
    sections.push(`## Database Migrations`);
    sections.push(categories.migration.map((f) => `- \`${f}\``).join('\n'));
  }

  if (categories.seeder.length > 0) {
    sections.push('');
    sections.push(`## Database Seeders`);
    sections.push(categories.seeder.map((f) => `- \`${f}\``).join('\n'));
  }

  if (categories.vulnerability.length > 0) {
    sections.push('');
    sections.push(`## Dependency / Vulnerability Risk Files`);
    sections.push(categories.vulnerability.map((f) => `- \`${f}\``).join('\n'));
  }

  if (categories.critical.length > 0) {
    sections.push('');
    sections.push(`## Critical Infrastructure Changes`);
    sections.push(categories.critical.map((f) => `- \`${f}\``).join('\n'));
  }

  if (categories.other.length > 0) {
    sections.push('');
    sections.push(`## Other Changed Files`);
    sections.push(categories.other.map((f) => `- \`${f}\``).join('\n'));
  }

  // Include diff truncated to avoid huge prompts
  const maxDiffLength = 8000;
  const truncatedDiff = diff.length > maxDiffLength ? diff.slice(0, maxDiffLength) + '\n...(truncated)' : diff;

  if (truncatedDiff.trim()) {
    sections.push('');
    sections.push(`## Git Diff`);
    sections.push('```diff');
    sections.push(truncatedDiff);
    sections.push('```');
  }

  sections.push('');
  sections.push(
    `Based on the above, produce a complete GMUD document with the following sections:\n` +
      `1. **Change Description** – what is being deployed and why\n` +
      `2. **Impact Assessment** – which systems/services are affected\n` +
      `3. **Risk Analysis** – risks and vulnerabilities identified (be specific about dependency changes or security-sensitive files)\n` +
      `4. **Rollback Plan** – how to revert if something goes wrong\n` +
      `5. **Deploy Checklist** – step-by-step deployment checklist including env updates, migrations, seeders\n` +
      `6. **Post-Deploy Validation** – how to verify the deploy succeeded`
  );

  return sections.join('\n');
}

/**
 * Generate a GMUD document from an analysis result using the specified AI provider.
 * @param {object} analysis - Result from analyzeBranches
 * @param {object} options
 * @param {string} [options.provider] - 'claude' or 'copilot' (default: 'claude')
 * @param {string} [options.model] - Model override
 * @param {number} [options.maxTokens] - Max tokens
 * @returns {Promise<string>} Generated GMUD Markdown
 */
async function generateGmud(analysis, options = {}) {
  const prompt = buildPrompt(analysis);
  const provider = options.provider || 'claude';

  switch (provider) {
    case 'claude':
      return generateWithClaude(prompt, options);
    case 'copilot':
      return generateWithCopilot(prompt, options);
    default:
      throw new Error(`Unknown AI provider: "${provider}". Supported providers: claude, copilot`);
  }
}

module.exports = { generateGmud, buildPrompt };
