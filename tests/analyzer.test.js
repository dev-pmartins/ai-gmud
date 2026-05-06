'use strict';

/**
 * Tests for the branch analyzer.
 * The analyzer depends on a live git repository, so we mock simple-git
 * to avoid real git operations in unit tests.
 */

jest.mock('simple-git', () => {
  return jest.fn(() => ({
    fetch: jest.fn().mockResolvedValue(undefined),
    diffSummary: jest.fn().mockResolvedValue({
      files: [
        { file: '.env.example', insertions: 1, deletions: 0, binary: false },
        { file: 'migrations/20240101_create_users.sql', insertions: 10, deletions: 0, binary: false },
        { file: 'seeds/UserSeeder.js', insertions: 5, deletions: 0, binary: false },
        { file: 'package.json', insertions: 2, deletions: 1, binary: false },
        { file: 'Dockerfile', insertions: 3, deletions: 0, binary: false },
        { file: 'src/app.js', insertions: 20, deletions: 5, binary: false },
      ],
      insertions: 41,
      deletions: 6,
    }),
    diff: jest.fn().mockResolvedValue('diff --git a/.env.example b/.env.example\n+NEW_VAR=value'),
  }));
});

const { analyzeBranches } = require('../src/analyzer');

describe('analyzeBranches', () => {
  let result;

  beforeAll(async () => {
    result = await analyzeBranches('/fake/repo', 'homolog', 'master');
  });

  test('returns correct branch names', () => {
    expect(result.fromBranch).toBe('homolog');
    expect(result.toBranch).toBe('master');
  });

  test('returns total files count', () => {
    expect(result.totalFiles).toBe(6);
  });

  test('returns insertions and deletions', () => {
    expect(result.insertions).toBe(41);
    expect(result.deletions).toBe(6);
  });

  test('classifies env files', () => {
    expect(result.categories.env).toContain('.env.example');
  });

  test('classifies migration files', () => {
    expect(result.categories.migration).toContain('migrations/20240101_create_users.sql');
  });

  test('classifies seeder files', () => {
    expect(result.categories.seeder).toContain('seeds/UserSeeder.js');
  });

  test('classifies vulnerability files', () => {
    expect(result.categories.vulnerability).toContain('package.json');
  });

  test('classifies critical files', () => {
    expect(result.categories.critical).toContain('Dockerfile');
  });

  test('classifies unrecognized files as other', () => {
    expect(result.categories.other).toContain('src/app.js');
  });

  test('includes diff output', () => {
    expect(result.diff).toContain('NEW_VAR=value');
  });

  test('includes all files in result.files', () => {
    expect(result.files).toHaveLength(6);
    const paths = result.files.map((f) => f.file);
    expect(paths).toContain('.env.example');
    expect(paths).toContain('src/app.js');
  });

  test('each file entry has required fields', () => {
    for (const file of result.files) {
      expect(file).toHaveProperty('file');
      expect(file).toHaveProperty('insertions');
      expect(file).toHaveProperty('deletions');
      expect(file).toHaveProperty('binary');
      expect(file).toHaveProperty('categories');
      expect(Array.isArray(file.categories)).toBe(true);
    }
  });
});
