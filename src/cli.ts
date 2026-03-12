#!/usr/bin/env node

import { Command } from 'commander';
import { CodeAnalyzer } from './analyzer.js';
import { ViolationFormatter } from './formatter.js';
import { GuardrailsConfig } from './types/config.js';
import { loadConfig } from './config-loader.js';
import { sync as globSync } from 'glob';
import { runWizard } from './wizard/index.js';

const program = new Command();

program
  .name('design-guardrails')
  .description(
    'Make your AI coding agent use your design system without human intervention.',
  )
  .version('0.1.0');

program
  .command('check')
  .description('Check files for design system violations')
  .option('-c, --config <path>', 'Path to guardrails config file')
  .option('--json', 'Output results as JSON')
  .action((options) => {
    const config = loadConfig(process.cwd(), options.config);
    if (!config) {
      console.error('No guardrails config found. run npx design-guardrails');
      process.exit(1);
    }

    const files = resolveFiles(config);
    if (files.length === 0) {
      console.log('No files matched the include patterns.');
      return;
    }

    const analyzer = new CodeAnalyzer(config);
    const results = analyzer.analyzeFiles(files);
    const formatter = new ViolationFormatter();

    if (options.json) {
      console.log(formatter.formatAsJson(results));
    } else {
      const output = formatter.formatForClaudeCode(results);
      if (output) {
        console.log(output);
      }
      console.log(formatter.formatSummary(results));
    }

    const hasViolations = results.some((r) => r.violations.length > 0);
    if (hasViolations) {
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Interactive setup wizard')
  .action(async () => {
    await runWizard();
  });

// Default action: run wizard when no subcommand is given
program.action(async () => {
  await runWizard();
});

program.parseAsync();

function resolveFiles(config: GuardrailsConfig): string[] {
  const cwd = process.cwd();
  const files: string[] = [];

  for (const pattern of config.include) {
    const matched = globSync(pattern, {
      cwd,
      absolute: true,
      ignore: config.exclude,
    });
    files.push(...matched);
  }

  return [...new Set(files)];
}
