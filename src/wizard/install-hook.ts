import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const HOOK_COMMAND = 'node node_modules/design-guardrails/dist/hooks/claude-code.js';

interface HookEntry {
  matcher: string;
  hooks: { type: string; command: string }[];
}

export function installHook(cwd: string): { installed: boolean; message: string } {
  const claudeDir = join(cwd, '.claude');
  const settingsPath = join(claudeDir, 'settings.json');

  let settings: Record<string, any> = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    } catch {
      return { installed: false, message: 'Failed to parse .claude/settings.json' };
    }
  }

  // Initialize hooks structure if missing
  if (!settings.hooks) {
    settings.hooks = {};
  }
  if (!Array.isArray(settings.hooks.PostToolUse)) {
    settings.hooks.PostToolUse = [];
  }

  // Check if design-guardrails hook already exists
  const alreadyInstalled = settings.hooks.PostToolUse.some((entry: HookEntry) =>
    entry.hooks?.some((h: { command: string }) => h.command.includes('design-guardrails'))
  );

  if (alreadyInstalled) {
    return { installed: false, message: 'Claude Code hook already installed' };
  }

  // Append the hook
  settings.hooks.PostToolUse.push({
    matcher: 'Edit|Write',
    hooks: [{
      type: 'command',
      command: HOOK_COMMAND,
    }],
  });

  // Write back
  mkdirSync(claudeDir, { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');

  return { installed: true, message: 'Claude Code hook installed' };
}
