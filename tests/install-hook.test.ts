import { installHook } from '../src/wizard/install-hook';
import * as fs from 'fs';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('installHook', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFs.mkdirSync.mockReturnValue(undefined);
    mockFs.writeFileSync.mockReturnValue(undefined);
  });

  it('should create new settings file when none exists', () => {
    mockFs.existsSync.mockReturnValue(false);

    const result = installHook('/project');

    expect(result.installed).toBe(true);
    expect(mockFs.mkdirSync).toHaveBeenCalled();
    expect(mockFs.writeFileSync).toHaveBeenCalled();

    const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
    expect(written.hooks.PostToolUse).toHaveLength(1);
    expect(written.hooks.PostToolUse[0].matcher).toBe('Edit|Write');
  });

  it('should merge into existing settings without overwriting', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      permissions: { allow: ['Read'] },
      hooks: {
        PostToolUse: [{
          matcher: 'Bash',
          hooks: [{ type: 'command', command: 'echo test' }],
        }],
      },
    }));

    const result = installHook('/project');

    expect(result.installed).toBe(true);
    const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
    expect(written.hooks.PostToolUse).toHaveLength(2);
    expect(written.permissions.allow).toEqual(['Read']);
  });

  it('should skip if design-guardrails hook already exists', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      hooks: {
        PostToolUse: [{
          matcher: 'Edit|Write',
          hooks: [{ type: 'command', command: 'node node_modules/design-guardrails/dist/hooks/claude-code.js' }],
        }],
      },
    }));

    const result = installHook('/project');

    expect(result.installed).toBe(false);
    expect(result.message).toContain('already installed');
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('should handle missing hooks key in existing settings', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      permissions: { allow: ['Read'] },
    }));

    const result = installHook('/project');

    expect(result.installed).toBe(true);
    const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
    expect(written.hooks.PostToolUse).toHaveLength(1);
  });
});
