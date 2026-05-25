'use strict';

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.resolve(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'server.log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function formatEntry(level, message, meta) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level}] ${message}`;
  if (!meta || Object.keys(meta).length === 0) return base;
  try {
    return `${base} ${JSON.stringify(meta)}`;
  } catch {
    return `${base} [unserializable meta]`;
  }
}

function write(level, message, meta = {}) {
  const line = formatEntry(level, message, meta) + '\n';
  try {
    fs.appendFileSync(LOG_FILE, line, 'utf-8');
  } catch (err) {
    // Don't crash the app if logging fails
    process.stderr.write(`[logger] Failed to write log: ${err.message}\n`);
  }
}

const logger = {
  info: (message, meta) => write('INFO ', message, meta),
  warn: (message, meta) => write('WARN ', message, meta),
  error: (message, meta) => write('ERROR', message, meta),
  debug: (message, meta) => write('DEBUG', message, meta),

  /** Returns the absolute path to the log file. */
  logFile: LOG_FILE,
};

module.exports = { logger };
