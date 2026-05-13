'use strict';

const { spawn, execFileSync } = require('child_process');

const CLAUDE_CLI = process.env.CLAUDE_CLI_PATH || 'claude';

/** @type {boolean|null} */
let _cliAvailable = null;

/**
 * Returns true if the claude CLI is installed and executable.
 * Result is cached after the first call.
 * @returns {boolean}
 */
function isCliAvailable() {
  if (_cliAvailable === null) {
    try {
      execFileSync('which', [CLAUDE_CLI], { stdio: 'pipe' });
      _cliAvailable = true;
    } catch {
      _cliAvailable = false;
    }
  }
  return _cliAvailable;
}

/**
 * Generates text using the locally-installed Claude Code CLI (`claude`).
 * Does NOT require ANTHROPIC_API_KEY — uses the CLI's own OAuth session.
 *
 * @param {string} prompt - The full prompt to send
 * @param {object} [options]
 * @param {string}   [options.model]    - Model alias, e.g. 'sonnet' or 'claude-sonnet-4-6'
 * @param {Function} [options.onChunk]  - Called with each incremental text chunk
 * @returns {Promise<string>} Complete generated text
 */
function generateWithClaudeCli(prompt, options = {}) {
  return new Promise((resolve, reject) => {
    const args = [
      '--print',
      '--output-format', 'stream-json',
      '--verbose',
      '--include-partial-messages',
      '--tools', '',
      '--no-session-persistence',
      '--dangerously-skip-permissions',
    ];

    if (options.model) args.push('--model', options.model);

    const proc = spawn(CLAUDE_CLI, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let lineBuffer = '';
    let fullText = '';
    let settled = false;

    proc.stdout.on('data', (data) => {
      lineBuffer += data.toString();
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop(); // keep the incomplete last line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let event;
        try { event = JSON.parse(trimmed); } catch { continue; }

        // Incremental text deltas come inside stream_events
        if (event.type === 'stream_event') {
          const e = event.event || {};
          if (e.type === 'content_block_delta' && e.delta?.type === 'text_delta' && e.delta.text) {
            fullText += e.delta.text;
            if (typeof options.onChunk === 'function') options.onChunk(e.delta.text);
          }
        }

        // Final authoritative result
        if (event.type === 'result' && event.subtype === 'success' && event.result) {
          fullText = event.result;
        }
      }
    });

    let stderr = '';
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      if (code !== 0 && !fullText) {
        reject(new Error(`claude CLI exited with code ${code}: ${stderr.slice(0, 500)}`));
      } else {
        resolve(fullText);
      }
    });

    proc.on('error', (err) => {
      if (settled) return;
      settled = true;
      reject(new Error(`Failed to spawn claude CLI: ${err.message}`));
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

module.exports = { generateWithClaudeCli, isCliAvailable };
