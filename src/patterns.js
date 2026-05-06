'use strict';

/**
 * File patterns used to classify changes during deploy analysis.
 */

const ENV_PATTERNS = [
  /\.env(\.\w+)?$/,
  /\.env\.example$/,
  /config\/.*\.(js|ts|json|yaml|yml)$/i,
  /settings\.(js|ts|json|yaml|yml)$/i,
  /application\.(properties|yml|yaml)$/i,
];

const DB_MIGRATION_PATTERNS = [
  /migrations?\//i,
  /database\/migrations?\//i,
  /db\/migrations?\//i,
  /\d+_.*\.(sql|js|ts|php|rb|py)$/,
  /schema\.(sql|rb|prisma)$/i,
  /knexfile\.(js|ts)$/i,
  /flyway/i,
  /liquibase/i,
];

const SEEDER_PATTERNS = [
  /seeds?\//i,
  /seeders?\//i,
  /database\/seeds?\//i,
  /db\/seeds?\//i,
  /fixtures?\//i,
];

const VULNERABILITY_PATTERNS = [
  /package(-lock)?\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /composer\.lock$/,
  /Gemfile\.lock$/,
  /requirements.*\.txt$/i,
  /go\.sum$/,
  /Pipfile\.lock$/,
  /\.npmrc$/,
];

const CRITICAL_PATTERNS = [
  /Dockerfile/i,
  /docker-compose(\.\w+)?\.ya?ml$/i,
  /\.github\/workflows\//i,
  /ci\.ya?ml$/i,
  /\.gitlab-ci\.ya?ml$/i,
  /nginx\.conf$/i,
  /apache.*\.conf$/i,
  /ssl\//i,
  /certs?\//i,
  /secrets?\//i,
  /auth\//i,
  /security\//i,
  /firewall\//i,
  /iam\//i,
  /terraform\//i,
  /kubernetes\//i,
  /k8s\//i,
  /helm\//i,
];

/**
 * Classify a file path into one or more categories.
 * @param {string} filePath
 * @returns {string[]} Array of category names that match
 */
function classifyFile(filePath) {
  const categories = [];

  if (ENV_PATTERNS.some((p) => p.test(filePath))) categories.push('env');
  if (DB_MIGRATION_PATTERNS.some((p) => p.test(filePath))) categories.push('migration');
  if (SEEDER_PATTERNS.some((p) => p.test(filePath))) categories.push('seeder');
  if (VULNERABILITY_PATTERNS.some((p) => p.test(filePath))) categories.push('vulnerability');
  if (CRITICAL_PATTERNS.some((p) => p.test(filePath))) categories.push('critical');

  return categories;
}

module.exports = {
  ENV_PATTERNS,
  DB_MIGRATION_PATTERNS,
  SEEDER_PATTERNS,
  VULNERABILITY_PATTERNS,
  CRITICAL_PATTERNS,
  classifyFile,
};
