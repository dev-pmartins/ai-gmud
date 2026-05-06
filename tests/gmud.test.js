'use strict';

const { buildPrompt } = require('../src/gmud');

const mockAnalysis = {
  fromBranch: 'homolog',
  toBranch: 'master',
  totalFiles: 5,
  insertions: 100,
  deletions: 20,
  categories: {
    env: ['.env.example'],
    migration: ['migrations/20240101_create_users.sql'],
    seeder: ['seeds/UserSeeder.js'],
    vulnerability: ['package.json'],
    critical: ['Dockerfile'],
    other: ['src/app.js', 'src/utils.js'],
  },
  diff: 'diff --git a/.env.example b/.env.example\n+NEW_FEATURE_FLAG=true',
};

describe('buildPrompt', () => {
  let prompt;

  beforeEach(() => {
    prompt = buildPrompt(mockAnalysis);
  });

  test('includes source and target branch names', () => {
    expect(prompt).toContain('homolog');
    expect(prompt).toContain('master');
  });

  test('includes total files changed', () => {
    expect(prompt).toContain('5');
  });

  test('includes insertions and deletions', () => {
    expect(prompt).toContain('100');
    expect(prompt).toContain('20');
  });

  test('includes env files section', () => {
    expect(prompt).toContain('Environment');
    expect(prompt).toContain('.env.example');
  });

  test('includes migration files section', () => {
    expect(prompt).toContain('Migration');
    expect(prompt).toContain('migrations/20240101_create_users.sql');
  });

  test('includes seeder files section', () => {
    expect(prompt).toContain('Seeder');
    expect(prompt).toContain('seeds/UserSeeder.js');
  });

  test('includes vulnerability files section', () => {
    expect(prompt).toContain('Vulnerability');
    expect(prompt).toContain('package.json');
  });

  test('includes critical files section', () => {
    expect(prompt).toContain('Critical');
    expect(prompt).toContain('Dockerfile');
  });

  test('includes git diff', () => {
    expect(prompt).toContain('NEW_FEATURE_FLAG');
  });

  test('requests all GMUD sections', () => {
    expect(prompt).toContain('Change Description');
    expect(prompt).toContain('Impact Assessment');
    expect(prompt).toContain('Risk Analysis');
    expect(prompt).toContain('Rollback Plan');
    expect(prompt).toContain('Deploy Checklist');
    expect(prompt).toContain('Post-Deploy Validation');
  });

  test('truncates very long diffs', () => {
    const longDiff = 'a'.repeat(20000);
    const analysisWithLongDiff = { ...mockAnalysis, diff: longDiff };
    const p = buildPrompt(analysisWithLongDiff);
    expect(p).toContain('truncated');
  });

  test('skips empty sections', () => {
    const emptyAnalysis = {
      ...mockAnalysis,
      categories: {
        env: [],
        migration: [],
        seeder: [],
        vulnerability: [],
        critical: [],
        other: [],
      },
    };
    const p = buildPrompt(emptyAnalysis);
    expect(p).not.toContain('Environment Variables');
    expect(p).not.toContain('Database Migrations');
    expect(p).not.toContain('Database Seeders');
  });
});

describe('generateGmud', () => {
  const { generateGmud } = require('../src/gmud');

  test('throws for unknown provider', async () => {
    await expect(generateGmud(mockAnalysis, { provider: 'unknown-ai' })).rejects.toThrow(
      'Unknown AI provider'
    );
  });

  test('throws for claude without API key', async () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    await expect(generateGmud(mockAnalysis, { provider: 'claude' })).rejects.toThrow(
      'ANTHROPIC_API_KEY'
    );

    process.env.ANTHROPIC_API_KEY = original;
  });

  test('throws for copilot without GITHUB_TOKEN', async () => {
    const original = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;

    await expect(generateGmud(mockAnalysis, { provider: 'copilot' })).rejects.toThrow(
      'GITHUB_TOKEN'
    );

    process.env.GITHUB_TOKEN = original;
  });
});
