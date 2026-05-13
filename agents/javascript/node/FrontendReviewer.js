'use strict';

const { buildPrompt: genericPrompt } = require('../../generic/FrontendReviewer');

const name = 'FrontendReviewer';
const description = 'Reviews Node.js project frontend assets and template changes.';

function buildPrompt(analysis, stack) {
  return genericPrompt(analysis, stack);
}

module.exports = { name, description, buildPrompt };
