import { scanTokens } from '../src/wizard/scan-tokens';
import * as fs from 'fs';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('scanTokens', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should extract hex colors from tailwind config', () => {
    mockFs.existsSync.mockImplementation((p: any) =>
      String(p).endsWith('tailwind.config.js')
    );
    mockFs.readFileSync.mockReturnValue(`
      module.exports = {
        theme: {
          extend: {
            colors: {
              primary: '#3b82f6',
              secondary: '#64748b',
            }
          }
        }
      }
    `);

    const tokens = scanTokens('/project');
    expect(tokens).toEqual(expect.arrayContaining([
      expect.objectContaining({ hexValue: '#3b82f6', tokenName: 'primary' }),
      expect.objectContaining({ hexValue: '#64748b', tokenName: 'secondary' }),
    ]));
  });

  it('should extract CSS custom properties', () => {
    mockFs.existsSync.mockImplementation((p: any) =>
      String(p).endsWith('globals.css')
    );
    mockFs.readFileSync.mockReturnValue(`
      :root {
        --foreground: #1a1a1a;
        --background: #ffffff;
        --accent: #e11d48;
      }
    `);

    const tokens = scanTokens('/project');
    expect(tokens).toEqual(expect.arrayContaining([
      expect.objectContaining({ hexValue: '#1a1a1a', tokenName: '--foreground' }),
      expect.objectContaining({ hexValue: '#ffffff', tokenName: '--background' }),
      expect.objectContaining({ hexValue: '#e11d48', tokenName: '--accent' }),
    ]));
  });

  it('should deduplicate hex values across sources', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockImplementation((p: any) => {
      if (String(p).includes('tailwind')) {
        return `colors: { primary: '#3b82f6' }`;
      }
      return `--primary: #3b82f6;`;
    });

    const tokens = scanTokens('/project');
    const matching = tokens.filter(t => t.hexValue === '#3b82f6');
    expect(matching.length).toBe(1);
    // Tailwind source should be preferred (scanned first)
    expect(matching[0].source).toContain('tailwind');
  });

  it('should normalize 3-char hex to 6-char', () => {
    mockFs.existsSync.mockImplementation((p: any) =>
      String(p).endsWith('globals.css')
    );
    mockFs.readFileSync.mockReturnValue(`--text: #fff;`);

    const tokens = scanTokens('/project');
    expect(tokens[0].hexValue).toBe('#ffffff');
  });

  it('should return empty array when no files found', () => {
    mockFs.existsSync.mockReturnValue(false);
    const tokens = scanTokens('/project');
    expect(tokens).toEqual([]);
  });
});
