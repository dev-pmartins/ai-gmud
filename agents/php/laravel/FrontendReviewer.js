'use strict';

const { buildPrompt: genericPrompt } = require('../../generic/FrontendReviewer');

const name = 'FrontendReviewer';
const description = 'Reviews Laravel Blade, Vue/Inertia, Livewire, and asset pipeline changes.';

function buildPrompt(analysis, stack) {
  const base = genericPrompt(analysis, stack);

  const laravelFrontendNote = [
    '',
    '## Laravel Frontend Context',
    'This is a **Laravel** project. Pay special attention to:',
    '- **Blade templates** (`resources/views/**/*.blade.php`): Check for XSS via unescaped `{!! !!}`, broken layouts',
    '- **Livewire components** (`app/Http/Livewire`, `app/Livewire`): State management and hydration issues',
    '- **Inertia.js pages** (`resources/js/Pages`): Props typing, shared data changes',
    '- **Laravel Mix / Vite** (`webpack.mix.js`, `vite.config.js`): Asset compilation changes',
    '- **`resources/lang`**: Missing translation keys that break UI',
    '- **`public/`**: Direct file changes that bypass the build pipeline',
  ].join('\n');

  return base + laravelFrontendNote;
}

module.exports = { name, description, buildPrompt };
