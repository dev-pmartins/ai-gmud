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
async function analyzeBranches(repoPath, fromBranch, toBranch) {
  const git = simpleGit(repoPath);

  await git.fetch();

  const diffSummary = await git.diffSummary([`${fromBranch}...${toBranch}`]);
  const diffOutput = await git.diff([`${fromBranch}...${toBranch}`]);

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

  return result;
}

module.exports = { analyzeBranches };
