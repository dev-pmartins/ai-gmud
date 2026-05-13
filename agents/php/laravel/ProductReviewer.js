'use strict';

const { buildPrompt: genericPrompt } = require('../../generic/ProductReviewer');

const name = 'ProductReviewer';
const description = 'Reviews Laravel project deliveries from a product and stakeholder perspective.';

function buildPrompt(analysis, stack) {
  const base = genericPrompt(analysis, stack);

  const laravelProductNote = [
    '',
    '## Laravel Project Context',
    'This is a **Laravel** project. When assessing product impact, consider:',
    '- Migrations may require a **maintenance window** if they alter large tables',
    '- Queue workers must be **restarted** after deploy — jobs may be delayed',
    '- Config/route cache changes require an **Artisan cache refresh** — plan for seconds of downtime',
    '- Feature flags or A/B tests may need to be toggled via admin panel after deploy',
  ].join('\n');

  return base + laravelProductNote;
}

module.exports = { name, description, buildPrompt };
