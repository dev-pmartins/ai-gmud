'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = path.join(__dirname, '..', 'cache');
const REPOSITORIES_CACHE_FILE = path.join(CACHE_DIR, 'repositories.json');

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Generates a stable short key for a repository path.
 * @param {string} repoPath
 * @returns {string}
 */
function getRepoKey(repoPath) {
  return crypto.createHash('sha256').update(repoPath).digest('hex').slice(0, 16);
}

function getCachePath(repoPath) {
  return path.join(CACHE_DIR, `${getRepoKey(repoPath)}.json`);
}

/**
 * Read cached data for a repository.
 * @param {string} repoPath
 * @returns {object|null}
 */
function readCache(repoPath) {
  const cachePath = getCachePath(repoPath);
  if (!fs.existsSync(cachePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Write (merge) data into the cache for a repository.
 * @param {string} repoPath
 * @param {object} data
 * @returns {object} Updated cache entry
 */
function writeCache(repoPath, data) {
  ensureCacheDir();
  const existing = readCache(repoPath) || {};
  const updated = {
    ...existing,
    ...data,
    repoPath,
    repoKey: getRepoKey(repoPath),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(getCachePath(repoPath), JSON.stringify(updated, null, 2));
  return updated;
}

/**
 * Delete cached data for a repository.
 * @param {string} repoPath
 */
function clearCache(repoPath) {
  const cachePath = getCachePath(repoPath);
  if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
}

/**
 * List all cache entries.
 * @returns {object[]}
 */
function listCache() {
  ensureCacheDir();
  return fs
    .readdirSync(CACHE_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'repositories.json')
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf-8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Read cached repository scan for a base path.
 * @param {string} basePath
 * @returns {{ repositories: string[], updatedAt: string }|null}
 */
function readRepositoriesCache(basePath) {
  ensureCacheDir();
  if (!fs.existsSync(REPOSITORIES_CACHE_FILE)) return null;

  try {
    const all = JSON.parse(fs.readFileSync(REPOSITORIES_CACHE_FILE, 'utf-8'));
    const key = getRepoKey(path.resolve(basePath));
    return all[key] || null;
  } catch {
    return null;
  }
}

/**
 * Write cached repository scan for a base path.
 * @param {string} basePath
 * @param {string[]} repositories
 * @returns {{ repositories: string[], updatedAt: string }}
 */
function writeRepositoriesCache(basePath, repositories) {
  ensureCacheDir();
  let all = {};

  if (fs.existsSync(REPOSITORIES_CACHE_FILE)) {
    try {
      all = JSON.parse(fs.readFileSync(REPOSITORIES_CACHE_FILE, 'utf-8'));
    } catch {
      all = {};
    }
  }

  const normalizedBase = path.resolve(basePath);
  const key = getRepoKey(normalizedBase);
  const entry = {
    basePath: normalizedBase,
    repositories,
    updatedAt: new Date().toISOString(),
  };

  all[key] = entry;
  fs.writeFileSync(REPOSITORIES_CACHE_FILE, JSON.stringify(all, null, 2));
  return entry;
}

module.exports = {
  readCache,
  writeCache,
  clearCache,
  listCache,
  getRepoKey,
  readRepositoriesCache,
  writeRepositoriesCache,
};
