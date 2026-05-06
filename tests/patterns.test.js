'use strict';

const { classifyFile, ENV_PATTERNS, DB_MIGRATION_PATTERNS, SEEDER_PATTERNS, VULNERABILITY_PATTERNS, CRITICAL_PATTERNS } =
  require('../src/patterns');

describe('classifyFile', () => {
  describe('env files', () => {
    test.each([
      '.env',
      '.env.production',
      '.env.local',
      '.env.example',
      'config/database.js',
      'config/settings.yaml',
      'settings.json',
      'application.properties',
      'application.yml',
    ])('classifies %s as env', (file) => {
      const categories = classifyFile(file);
      expect(categories).toContain('env');
    });
  });

  describe('migration files', () => {
    test.each([
      'database/migrations/20240101_create_users.sql',
      'migrations/0001_add_column.js',
      'db/migrations/CreateUsersTable.php',
      '20231215_alter_orders.sql',
      'schema.sql',
      'schema.rb',
    ])('classifies %s as migration', (file) => {
      const categories = classifyFile(file);
      expect(categories).toContain('migration');
    });
  });

  describe('seeder files', () => {
    test.each([
      'database/seeds/UserSeeder.js',
      'seeds/initial_data.sql',
      'seeders/ProductSeeder.php',
      'db/seeds/categories.rb',
      'fixtures/users.yaml',
    ])('classifies %s as seeder', (file) => {
      const categories = classifyFile(file);
      expect(categories).toContain('seeder');
    });
  });

  describe('vulnerability risk files', () => {
    test.each([
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'composer.lock',
      'Gemfile.lock',
      'requirements.txt',
      'requirements-dev.txt',
      'go.sum',
    ])('classifies %s as vulnerability', (file) => {
      const categories = classifyFile(file);
      expect(categories).toContain('vulnerability');
    });
  });

  describe('critical files', () => {
    test.each([
      'Dockerfile',
      'docker-compose.yml',
      'docker-compose.prod.yaml',
      '.github/workflows/ci.yml',
      'nginx.conf',
      'ssl/server.crt',
      'secrets/api_key.txt',
      'auth/middleware.js',
      'terraform/main.tf',
      'kubernetes/deployment.yaml',
      'k8s/service.yaml',
      'helm/values.yaml',
    ])('classifies %s as critical', (file) => {
      const categories = classifyFile(file);
      expect(categories).toContain('critical');
    });
  });

  describe('other files', () => {
    test.each([
      'src/app.js',
      'src/components/Button.jsx',
      'README.md',
      'tests/unit.test.js',
      'public/index.html',
    ])('classifies %s as other (empty categories)', (file) => {
      const categories = classifyFile(file);
      expect(categories).toHaveLength(0);
    });
  });

  describe('multiple categories', () => {
    test('a file can belong to multiple categories', () => {
      // A file in config/ that is also a package file can match both
      const categories = classifyFile('config/package.json');
      expect(categories).toContain('env');
      expect(categories).toContain('vulnerability');
    });
  });
});
