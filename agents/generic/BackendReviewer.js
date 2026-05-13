'use strict';

const name = 'BackendReviewer';
const description = 'Reviews backend changes: APIs, database, security, performance, and infrastructure.';

/**
 * Build a GMUD prompt focused on backend concerns.
 * @param {object} analysis - Result from analyzeBranches
 * @param {object} stack - { language, framework, confidence }
 * @returns {string}
 */
function buildPrompt(analysis, stack) {
  const { fromBranch, toBranch, totalFiles, insertions, deletions, categories, diff } = analysis;

  const lines = [];

  lines.push(`You are a **Senior Backend Engineer** conducting a deployment review.`);
  lines.push(`Your role is to analyze the changes from a backend perspective and generate a comprehensive GMUD document.`);
  lines.push('');
  lines.push(`## Repository Stack`);
  lines.push(`- **Language:** ${stack.language}`);
  lines.push(`- **Framework:** ${stack.framework}`);
  lines.push('');
  lines.push(`## Deployment Summary`);
  lines.push(`- **Source branch:** \`${fromBranch}\``);
  lines.push(`- **Target branch:** \`${toBranch}\``);
  lines.push(`- **Total files changed:** ${totalFiles}`);
  lines.push(`- **Lines added:** ${insertions}`);
  lines.push(`- **Lines removed:** ${deletions}`);

  if (categories.env.length > 0) {
    lines.push('');
    lines.push(`## ⚠️ Environment Variable Changes`);
    categories.env.forEach((f) => lines.push(`- \`${f}\``));
  }

  if (categories.migration.length > 0) {
    lines.push('');
    lines.push(`## 🗃️ Database Migrations`);
    categories.migration.forEach((f) => lines.push(`- \`${f}\``));
  }

  if (categories.seeder.length > 0) {
    lines.push('');
    lines.push(`## 🌱 Database Seeders`);
    categories.seeder.forEach((f) => lines.push(`- \`${f}\``));
  }

  if (categories.vulnerability.length > 0) {
    lines.push('');
    lines.push(`## 🔒 Dependency / Vulnerability Risk Files`);
    categories.vulnerability.forEach((f) => lines.push(`- \`${f}\``));
  }

  if (categories.critical.length > 0) {
    lines.push('');
    lines.push(`## 🚨 Critical Infrastructure Changes`);
    categories.critical.forEach((f) => lines.push(`- \`${f}\``));
  }

  if (categories.other.length > 0) {
    lines.push('');
    lines.push(`## Other Changed Files`);
    categories.other.forEach((f) => lines.push(`- \`${f}\``));
  }

  const maxDiffLength = 10000;
  const truncatedDiff = diff.length > maxDiffLength ? diff.slice(0, maxDiffLength) + '\n...(truncated)' : diff;
  if (truncatedDiff.trim()) {
    lines.push('');
    lines.push('## Git Diff');
    lines.push('```diff');
    lines.push(truncatedDiff);
    lines.push('```');
  }

  lines.push('');
  lines.push(`## Instructions`);
  lines.push(`Based on the above, produce a complete GMUD document with a **Backend-focused** review. Include:`);
  lines.push(`1. **Change Description** – What backend features, APIs, or fixes are being deployed`);
  lines.push(`2. **Impact Assessment** – Which services, endpoints, or database tables are affected`);
  lines.push(`3. **Risk Analysis** – Pay special attention to:`);
  lines.push(`   - New environment variables that must be set before deploy`);
  lines.push(`   - Database migrations: are they reversible? Do they lock tables?`);
  lines.push(`   - Breaking API changes that affect consumers`);
  lines.push(`   - Authentication/authorization changes`);
  lines.push(`   - Security vulnerabilities in dependency changes`);
  lines.push(`   - Infrastructure/CI-CD pipeline changes`);
  lines.push(`4. **Rollback Plan** – Database rollback, service restart procedures, migration reversion`);
  lines.push(`5. **Deploy Checklist** – Step-by-step including env setup, migration execution, service restart order`);
  lines.push(`6. **Post-Deploy Validation** – API health checks, database integrity checks, monitoring alerts`);

  return lines.join('\n');
}

module.exports = { name, description, buildPrompt };
