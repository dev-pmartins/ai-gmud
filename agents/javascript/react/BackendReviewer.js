'use strict';

const { buildPrompt: genericPrompt } = require('../../generic/BackendReviewer');

const name = 'BackendReviewer';
const description = 'Reviews React project backend (API contracts, environment config, SSR concerns).';

function buildPrompt(analysis, stack) {
  const base = genericPrompt(analysis, stack);

  const reactBackendNote = [
    '',
    '## React API/Backend Context',
    'This React project likely consumes APIs. Pay attention to:',
    '- **API base URLs** in `.env` or config files — `REACT_APP_*` or `VITE_*` variables',
    '- **CORS configuration** changes on the API side',
    '- **Authentication token handling**: localStorage, cookies, refresh token logic',
    '- **Breaking API response changes** that affect data mapping in components',
    '- **`package.json` proxy settings** for development vs production discrepancies',
  ].join('\n');

  return base + reactBackendNote;
}

module.exports = { name, description, buildPrompt };
