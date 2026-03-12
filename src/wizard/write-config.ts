import { writeFileSync } from 'fs';
import { join } from 'path';

export { configExists } from '../config-loader.js';

export interface WizardResult {
  include: string[];
  elementRules: { htmlElement: string; componentName: string; importPath: string }[];
  tokenRules: { hexValue: string; tokenName: string }[];
}

export function writeConfig(cwd: string, result: WizardResult): string {
  const elementsBlock = result.elementRules
    .map(r => `      ${JSON.stringify(r.htmlElement)}: { use: ${JSON.stringify(r.componentName)}, from: ${JSON.stringify(r.importPath)} }`)
    .join(',\n');

  const tokensBlock = result.tokenRules
    .map(r => `      ${JSON.stringify(r.hexValue)}: ${JSON.stringify(r.tokenName)}`)
    .join(',\n');

  const includeList = result.include.map(p => JSON.stringify(p)).join(', ');

  const content = `/** @type {import('design-guardrails').GuardrailsConfig} */
module.exports = {
  include: [${includeList}],
  rules: {
    elements: {
${elementsBlock}
    },
    tokens: {
${tokensBlock}
    }
  }
};
`;

  const filePath = join(cwd, 'guardrails.config.cjs');
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}
