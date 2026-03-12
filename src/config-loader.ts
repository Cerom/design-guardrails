import { join, resolve } from 'path';
import { GuardrailsConfig } from './types/config.js';

export const CONFIG_FILE_NAMES = [
  'guardrails.config.cjs',
  'guardrails.config.js',
  'guardrails.config.ts',
  '.guardrails.cjs',
  '.guardrails.js',
  '.guardrails.ts',
];

export function loadConfig(cwd: string, explicitPath?: string, clearCache = false): GuardrailsConfig | null {
  if (explicitPath) {
    try {
      const fullPath = resolve(cwd, explicitPath);
      const configModule = require(fullPath);
      return configModule.default || configModule;
    } catch {
      return null;
    }
  }

  for (const name of CONFIG_FILE_NAMES) {
    try {
      const fullPath = join(cwd, name);

      if (clearCache && require.cache[fullPath]) {
        delete require.cache[fullPath];
      }

      const configModule = require(fullPath);
      return configModule.default || configModule;
    } catch {
      continue;
    }
  }

  return null;
}

export function configExists(cwd: string): boolean {
  // Attempt to load — if it succeeds, a config exists
  return loadConfig(cwd) !== null;
}
