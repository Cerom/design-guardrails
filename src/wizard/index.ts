import chalk from 'chalk';
import inquirer from 'inquirer';
import { Spinner } from 'cli-spinner';
import { detectFramework } from './detect-framework.js';
import { scanComponents, DetectedElementRule } from './scan-components.js';
import { scanTokens, DetectedTokenRule } from './scan-tokens.js';
import { writeConfig, configExists } from './write-config.js';
import { installHook } from './install-hook.js';

function createSpinner(text: string): Spinner {
  const spinner = new Spinner(`${text} %s`);
  spinner.setSpinnerString('|/-\\');
  return spinner;
}

export async function runWizard(): Promise<void> {
  const cwd = process.cwd();

  console.log('');
  console.log(chalk.bold('design-guardrails') + ' setup wizard');
  console.log('');

  // Step 1: Detect framework
  const spinner1 = createSpinner('Detecting framework...');
  spinner1.start();
  const framework = detectFramework(cwd);
  spinner1.stop(true);

  if (framework.name !== 'unknown') {
    console.log(chalk.green('✔') + ` Detected ${chalk.bold(framework.displayName)} project`);
  } else {
    console.log(chalk.yellow('?') + ' Could not detect framework, using defaults');
  }

  // Step 2: Scan components
  const spinner2 = createSpinner('Scanning for component wrappers...');
  spinner2.start();
  const detectedElements = scanComponents(cwd);
  spinner2.stop(true);

  if (detectedElements.length > 0) {
    console.log(chalk.green('✔') + ` Found ${chalk.bold(String(detectedElements.length))} component wrapper(s)`);
  } else {
    console.log(chalk.yellow('?') + ' No component wrappers detected');
  }

  // Step 3: Scan tokens
  const spinner3 = createSpinner('Scanning for color tokens...');
  spinner3.start();
  const detectedTokens = scanTokens(cwd);
  spinner3.stop(true);

  if (detectedTokens.length > 0) {
    console.log(chalk.green('✔') + ` Found ${chalk.bold(String(detectedTokens.length))} color token(s)`);
  } else {
    console.log(chalk.yellow('?') + ' No color tokens detected');
  }

  console.log('');

  // Step 4: Confirm element rules
  let selectedElements: DetectedElementRule[] = [];
  if (detectedElements.length > 0) {
    const { elements } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'elements',
      message: 'Select element rules to include:',
      choices: detectedElements.map(e => ({
        name: `<${e.htmlElement}> → <${e.componentName}> from ${e.importPath}`,
        value: e,
        checked: true,
      })),
    }]);
    selectedElements = elements;
  }

  // Step 5: Confirm token rules
  let selectedTokens: DetectedTokenRule[] = [];
  if (detectedTokens.length > 0) {
    const { tokens } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'tokens',
      message: 'Select token rules to include:',
      choices: detectedTokens.map(t => ({
        name: `${t.hexValue} → ${t.tokenName} (${t.source})`,
        value: t,
        checked: true,
      })),
    }]);
    selectedTokens = tokens;
  }

  // Step 6: Include pattern
  const { includePattern } = await inquirer.prompt([{
    type: 'input',
    name: 'includePattern',
    message: 'Which files should guardrails watch?',
    default: framework.defaultInclude,
  }]);

  // Step 7: Check existing config
  if (configExists(cwd)) {
    const { overwrite } = await inquirer.prompt([{
      type: 'confirm',
      name: 'overwrite',
      message: 'A guardrails config already exists. Overwrite?',
      default: false,
    }]);
    if (!overwrite) {
      console.log(chalk.yellow('Skipped config write.'));
      return;
    }
  }

  console.log('');

  // Step 8: Write config
  writeConfig(cwd, {
    include: [includePattern],
    elementRules: selectedElements,
    tokenRules: selectedTokens,
  });
  console.log(chalk.green('✔') + ` Created ${chalk.bold('guardrails.config.cjs')}`);

  // Step 9: Install hook
  const hookResult = installHook(cwd);
  if (hookResult.installed) {
    console.log(chalk.green('✔') + ` ${hookResult.message}`);
  } else {
    console.log(chalk.yellow('!') + ` ${hookResult.message}`);
  }

  // Done
  console.log('');
  console.log(chalk.green.bold('Done.') + ' Claude Code will now enforce your design system automatically.');
  console.log('');
  console.log(`  Run ${chalk.cyan('npx design-guardrails check')} to verify.`);
  console.log('');
}
