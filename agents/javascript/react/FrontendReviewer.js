'use strict';

const { buildPrompt: genericPrompt } = require('../../generic/FrontendReviewer');

const name = 'FrontendReviewer';
const description = 'Reviews React-specific changes: hooks, state management, component architecture, and performance.';

function buildPrompt(analysis, stack) {
  const base = genericPrompt(analysis, stack);

  const reactNote = [
    '',
    '## React Frontend Context',
    'This is a **React** project. Pay special attention to:',
    '- **Hooks**: `useEffect` dependency arrays, stale closure bugs, missing cleanup',
    '- **Context API / Redux / Zustand**: State shape changes that break existing consumers',
    '- **React Router**: Route changes that break deep links or bookmarks',
    '- **Prop types / TypeScript interfaces**: Breaking changes in component APIs',
    '- **`key` props**: Changes that cause unnecessary re-mounts',
    '- **`React.lazy` / `Suspense`**: New lazy-loaded chunks and their fallback states',
    '- **`package.json` / `package-lock.json`**: React version upgrades have breaking changes',
    '- **Build output**: Check for bundle size regressions with source maps',
  ].join('\n');

  return base + reactNote;
}

module.exports = { name, description, buildPrompt };
