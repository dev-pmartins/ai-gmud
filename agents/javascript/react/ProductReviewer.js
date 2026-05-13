'use strict';

const { buildPrompt: genericPrompt } = require('../../generic/ProductReviewer');

const name = 'ProductReviewer';
const description = 'Reviews React project from a product perspective.';

function buildPrompt(analysis, stack) {
  return genericPrompt(analysis, stack);
}

module.exports = { name, description, buildPrompt };
