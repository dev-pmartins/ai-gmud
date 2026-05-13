'use strict';

const name = 'ProductReviewer';
const description = 'Reviews changes from a product perspective: user impact, feature scope, and stakeholder communication.';

/**
 * Build a GMUD prompt focused on product/business concerns.
 * @param {object} analysis - Result from analyzeBranches
 * @param {object} stack - { language, framework, confidence }
 * @returns {string}
 */
function buildPrompt(analysis, stack) {
  const { fromBranch, toBranch, totalFiles, insertions, deletions, categories, diff } = analysis;

  const lines = [];

  lines.push(`You are a **Technical Product Manager** conducting a deployment review.`);
  lines.push(`Your role is to translate technical changes into business impact and generate a GMUD document accessible to both technical and non-technical stakeholders.`);
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

  const hasCritical = categories.critical.length > 0 || categories.env.length > 0;
  const hasDb = categories.migration.length > 0 || categories.seeder.length > 0;
  const hasDependencies = categories.vulnerability.length > 0;

  if (hasCritical) {
    lines.push('');
    lines.push(`## ⚠️ High-Risk Areas (requires stakeholder attention)`);
    [...categories.env, ...categories.critical].forEach((f) => lines.push(`- \`${f}\``));
  }

  if (hasDb) {
    lines.push('');
    lines.push(`## 🗃️ Database Changes (potential downtime risk)`);
    [...categories.migration, ...categories.seeder].forEach((f) => lines.push(`- \`${f}\``));
  }

  if (hasDependencies) {
    lines.push('');
    lines.push(`## 📦 Dependency Changes`);
    categories.vulnerability.forEach((f) => lines.push(`- \`${f}\``));
  }

  lines.push('');
  lines.push(`## All Changed Files (${totalFiles} total)`);
  analysis.files.slice(0, 30).forEach((f) => lines.push(`- \`${f.file}\``));
  if (analysis.files.length > 30) {
    lines.push(`- ... and ${analysis.files.length - 30} more files`);
  }

  const maxDiffLength = 6000;
  const truncatedDiff = diff.length > maxDiffLength ? diff.slice(0, maxDiffLength) + '\n...(truncated)' : diff;
  if (truncatedDiff.trim()) {
    lines.push('');
    lines.push('## Git Diff (for technical context)');
    lines.push('```diff');
    lines.push(truncatedDiff);
    lines.push('```');
  }

  lines.push('');
  lines.push(`## Instructions`);
  lines.push(`Based on the above, produce a complete GMUD document with a **Product-focused** review. Write for a mixed audience. Include:`);
  lines.push(`1. **Change Description** – In plain language, what is being released and why (user value, business impact)`);
  lines.push(`2. **Impact Assessment** – Which user journeys, features, or business processes are affected`);
  lines.push(`3. **Risk Analysis** – Business risks: potential downtime, data loss, user-facing errors, compliance concerns`);
  lines.push(`4. **Rollback Plan** – Non-technical summary of revert strategy and estimated time`);
  lines.push(`5. **Communication Plan** – Who needs to be notified before, during, and after deploy`);
  lines.push(`6. **Deploy Checklist** – Combined technical and product steps`);
  lines.push(`7. **Post-Deploy Validation** – Business metric checks, user-reported issue monitoring window`);

  return lines.join('\n');
}

module.exports = { name, description, buildPrompt };
