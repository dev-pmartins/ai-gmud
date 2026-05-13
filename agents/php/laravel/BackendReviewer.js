'use strict';

const { buildPrompt: genericPrompt } = require('../../generic/BackendReviewer');

const name = 'BackendReviewer';
const description = 'Reviews Laravel-specific backend changes: Artisan, Eloquent, migrations, jobs, and security.';

function buildPrompt(analysis, stack) {
  const base = genericPrompt(analysis, stack);

  const laravelBackendNote = [
    '',
    '## Laravel Backend Context',
    'This is a **Laravel** project. Pay special attention to:',
    '- **Migrations** (`database/migrations`): Are they reversible with `down()`? Do they use `nullable()` for new columns to avoid lock?',
    '- **Seeders** (`database/seeders`): Will re-running them cause duplicate data? Are they idempotent?',
    '- **Eloquent Models**: New relationships, scope changes, hidden/fillable attribute changes (mass assignment risk)',
    '- **Service Providers**: Boot order, deferred providers, binding changes',
    '- **`config/`**: Cache invalidation required after changes — run `php artisan config:cache`',
    '- **Routes** (`routes/`): New middleware, auth changes, removed routes that may break API consumers',
    '- **Jobs/Queues** (`app/Jobs`): Queue worker restart needed? Queue driver changes?',
    '- **`.env` variables**: All new keys must be added to `.env.example` and production `.env`',
    '- **`composer.lock`**: Run `composer install --no-dev` on server, not `composer update`',
    '',
    '## Laravel Deploy Commands',
    'Typical post-deploy commands to include in checklist:',
    '```bash',
    'php artisan migrate --force',
    'php artisan config:cache',
    'php artisan route:cache',
    'php artisan view:cache',
    'php artisan queue:restart',
    'php artisan storage:link',
    '```',
  ].join('\n');

  return base + laravelBackendNote;
}

module.exports = { name, description, buildPrompt };
