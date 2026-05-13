'use strict';

const name = 'FrontendReviewer';
const description = 'Reviews frontend changes: UI components, styling, accessibility, and client-side security.';

/**
 * Build a GMUD prompt focused on frontend concerns.
 * @param {object} analysis - Result from analyzeBranches
 * @param {object} stack - { language, framework, confidence }
 * @returns {string}
 */
function buildPrompt(analysis, stack) {
  const { fromBranch, toBranch, totalFiles, insertions, deletions, categories, diff } = analysis;

  const lines = [];

  lines.push(`You are a **Senior Frontend Engineer** conducting a deployment review.`);
  lines.push(`Your role is to analyze the changes from a frontend perspective and generate a comprehensive GMUD document.`);
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

  lines.push('');
  lines.push(`## Frontend-Relevant Changed Files`);

  const frontendExtensions = /\.(tsx?|jsx?|vue|svelte|css|scss|sass|less|html?|svg)$/i;
  const frontendPaths = /\/(component|view|template|page|layout|asset|public|store|hook|util|style)/i;

  const frontendFiles = analysis.files.filter(
    (f) => frontendExtensions.test(f.file) || frontendPaths.test(f.file)
  );

  if (frontendFiles.length > 0) {
    frontendFiles.forEach((f) => lines.push(`- \`${f.file}\` (+${f.insertions} -${f.deletions})`));
  } else {
    lines.push('- No explicitly frontend files detected. Review all changed files below.');
  }

  appendCategorySection(lines, categories);

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
  lines.push(`Based on the above, produce a complete GMUD document with a **Frontend-focused** review. Include:`);
  lines.push(`1. **Change Description** – What UI/UX features or fixes are being deployed`);
  lines.push(`2. **Impact Assessment** – Which pages, components, or user flows are affected`);
  lines.push(`3. **Risk Analysis** – Pay special attention to:`);
  lines.push(`   - Breaking component API changes`);
  lines.push(`   - CSS/styling regressions`);
  lines.push(`   - Bundle size or performance impacts`);
  lines.push(`   - Accessibility regressions`);
  lines.push(`   - Client-side security issues (XSS, unsafe innerHTML, exposed secrets)`);
  lines.push(`4. **Rollback Plan** – How to revert UI changes safely`);
  lines.push(`5. **Deploy Checklist** – Steps including cache busting, CDN invalidation, feature flags`);
  lines.push(`6. **Post-Deploy Validation** – Visual testing, browser compatibility checks, performance metrics`);

  return lines.join('\n');
}

function appendCategorySection(lines, categories) {
  if (categories.env.length > 0) {
    lines.push('');
    lines.push(`## ⚠️ Environment Variable Changes`);
    categories.env.forEach((f) => lines.push(`- \`${f}\``));
  }
  if (categories.vulnerability.length > 0) {
    lines.push('');
    lines.push(`## 🔒 Dependency Risk Files`);
    categories.vulnerability.forEach((f) => lines.push(`- \`${f}\``));
  }
  if (categories.critical.length > 0) {
    lines.push('');
    lines.push(`## 🚨 Critical Infrastructure Changes`);
    categories.critical.forEach((f) => lines.push(`- \`${f}\``));
  }
}

module.exports = { name, description, buildPrompt };
