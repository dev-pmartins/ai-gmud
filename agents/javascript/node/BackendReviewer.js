'use strict';

const { buildPrompt: genericPrompt } = require('../../generic/BackendReviewer');

const name = 'BackendReviewer';
const description = 'Reviews Node.js/Express backend changes: routes, middleware, database, and security.';

function buildPrompt(analysis, stack) {
  const base = genericPrompt(analysis, stack);

  const nodeNote = [
    '',
    '## Node.js Backend Context',
    'This is a **Node.js** project. Pay special attention to:',
    '- **Express/Fastify routes**: New endpoints, removed endpoints, changed middleware order',
    '- **Authentication middleware**: JWT secret rotation, session configuration changes',
    '- **`package.json`/`package-lock.json`**: Security patches, major version bumps',
    '- **Environment variables**: `PORT`, `DATABASE_URL`, `JWT_SECRET`, API keys',
    '- **Database ORM changes** (Sequelize/Prisma/TypeORM): Schema migrations, model changes',
    '- **`pm2` / process manager**: Restart strategy, cluster mode changes',
    '- **Error handling middleware**: Changes that affect error response format consumed by clients',
  ].join('\n');

  return base + nodeNote;
}

module.exports = { name, description, buildPrompt };
