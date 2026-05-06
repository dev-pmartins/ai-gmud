#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { analyzeBranches } = require('../src/analyzer');
const { generateGmud } = require('../src/gmud');

const program = new Command();

program
  .name('deploy-helper')
  .description('Deploy helper tool: generates GMUD documents using AI for branch comparisons.')
  .version('1.0.0');

program
  .command('gmud')
  .description('Generate a GMUD document by comparing two branches')
  .option('-f, --from <branch>', 'Source branch', 'homolog')
  .option('-t, --to <branch>', 'Target branch', 'master')
  .option('-r, --repo <path>', 'Path to the git repository', process.cwd())
  .option('-p, --provider <provider>', 'AI provider: claude or copilot', 'claude')
  .option('-m, --model <model>', 'AI model override (optional)')
  .option('-o, --output <file>', 'Output file path (optional, defaults to stdout)')
  .option('--max-tokens <number>', 'Maximum tokens for AI response', parseInt)
  .action(async (options) => {
    const repoPath = path.resolve(options.repo);

    console.log(chalk.blue('🚀 deploy-helper — GMUD Generator'));
    console.log(chalk.gray(`   Repository : ${repoPath}`));
    console.log(chalk.gray(`   Branches   : ${options.from} → ${options.to}`));
    console.log(chalk.gray(`   AI Provider: ${options.provider}`));
    console.log('');

    try {
      console.log(chalk.yellow('🔍 Analyzing branch differences...'));
      const analysis = await analyzeBranches(repoPath, options.from, options.to);

      console.log(chalk.green(`✅ Analysis complete:`));
      console.log(`   • Files changed  : ${analysis.totalFiles}`);
      console.log(`   • Lines added    : ${analysis.insertions}`);
      console.log(`   • Lines removed  : ${analysis.deletions}`);

      if (analysis.categories.env.length > 0) {
        console.log(chalk.magenta(`   • Env changes    : ${analysis.categories.env.length} file(s)`));
      }
      if (analysis.categories.migration.length > 0) {
        console.log(chalk.magenta(`   • DB migrations  : ${analysis.categories.migration.length} file(s)`));
      }
      if (analysis.categories.seeder.length > 0) {
        console.log(chalk.magenta(`   • Seeders        : ${analysis.categories.seeder.length} file(s)`));
      }
      if (analysis.categories.vulnerability.length > 0) {
        console.log(chalk.red(`   • Vuln. risk     : ${analysis.categories.vulnerability.length} file(s)`));
      }
      if (analysis.categories.critical.length > 0) {
        console.log(chalk.red(`   • Critical infra : ${analysis.categories.critical.length} file(s)`));
      }

      console.log('');
      console.log(chalk.yellow(`🤖 Generating GMUD with ${options.provider}...`));

      const gmudOptions = { provider: options.provider };
      if (options.model) gmudOptions.model = options.model;
      if (options.maxTokens) gmudOptions.maxTokens = options.maxTokens;

      const gmud = await generateGmud(analysis, gmudOptions);

      if (options.output) {
        const outputPath = path.resolve(options.output);
        fs.writeFileSync(outputPath, gmud, 'utf8');
        console.log(chalk.green(`✅ GMUD saved to: ${outputPath}`));
      } else {
        console.log('');
        console.log(chalk.green('=== GMUD Document ==='));
        console.log('');
        console.log(gmud);
      }
    } catch (err) {
      console.error(chalk.red(`❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze branch differences without generating a GMUD (dry-run)')
  .option('-f, --from <branch>', 'Source branch', 'homolog')
  .option('-t, --to <branch>', 'Target branch', 'master')
  .option('-r, --repo <path>', 'Path to the git repository', process.cwd())
  .option('--json', 'Output analysis as JSON')
  .action(async (options) => {
    const repoPath = path.resolve(options.repo);

    console.log(chalk.blue('🔍 deploy-helper — Branch Analyzer'));
    console.log(chalk.gray(`   Repository : ${repoPath}`));
    console.log(chalk.gray(`   Branches   : ${options.from} → ${options.to}`));
    console.log('');

    try {
      const analysis = await analyzeBranches(repoPath, options.from, options.to);

      if (options.json) {
        const output = { ...analysis };
        delete output.diff;
        console.log(JSON.stringify(output, null, 2));
        return;
      }

      console.log(chalk.green(`📊 Analysis Results`));
      console.log(`   Files changed  : ${analysis.totalFiles}`);
      console.log(`   Lines added    : ${analysis.insertions}`);
      console.log(`   Lines removed  : ${analysis.deletions}`);
      console.log('');

      const printCategory = (label, files, color) => {
        if (files.length === 0) return;
        console.log(color(`${label} (${files.length}):`));
        for (const f of files) console.log(`   - ${f}`);
        console.log('');
      };

      printCategory('🔧 Environment Changes', analysis.categories.env, chalk.magenta);
      printCategory('🗃️  Database Migrations', analysis.categories.migration, chalk.cyan);
      printCategory('🌱 Database Seeders', analysis.categories.seeder, chalk.green);
      printCategory('⚠️  Vulnerability Risk Files', analysis.categories.vulnerability, chalk.red);
      printCategory('🚨 Critical Infrastructure', analysis.categories.critical, chalk.red.bold);
      printCategory('📄 Other Files', analysis.categories.other, chalk.gray);
    } catch (err) {
      console.error(chalk.red(`❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);
