import { detectFramework } from '../src/wizard/detect-framework';
import * as fs from 'fs';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('detectFramework', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should detect Next.js', () => {
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      dependencies: { next: '^14.0.0', react: '^18.0.0' },
    }));
    mockFs.existsSync.mockImplementation((p: any) =>
      String(p).endsWith('app') || String(p).endsWith('package.json')
    );

    const result = detectFramework('/project');
    expect(result.name).toBe('next');
    expect(result.displayName).toBe('Next.js');
  });

  it('should detect Vite', () => {
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      devDependencies: { vite: '^5.0.0' },
    }));
    mockFs.existsSync.mockImplementation((p: any) =>
      String(p).endsWith('src') || String(p).endsWith('package.json')
    );

    const result = detectFramework('/project');
    expect(result.name).toBe('vite');
    expect(result.displayName).toBe('Vite');
    expect(result.srcDir).toBe('src');
  });

  it('should detect CRA', () => {
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      dependencies: { 'react-scripts': '^5.0.0' },
    }));
    mockFs.existsSync.mockReturnValue(true);

    const result = detectFramework('/project');
    expect(result.name).toBe('cra');
  });

  it('should detect Remix', () => {
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      dependencies: { '@remix-run/react': '^2.0.0' },
    }));
    mockFs.existsSync.mockReturnValue(true);

    const result = detectFramework('/project');
    expect(result.name).toBe('remix');
  });

  it('should return unknown when no framework detected', () => {
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      dependencies: { express: '^4.0.0' },
    }));
    mockFs.existsSync.mockReturnValue(true);

    const result = detectFramework('/project');
    expect(result.name).toBe('unknown');
  });

  it('should return unknown when package.json is missing', () => {
    mockFs.readFileSync.mockImplementation(() => { throw new Error('ENOENT'); });
    mockFs.existsSync.mockReturnValue(false);

    const result = detectFramework('/project');
    expect(result.name).toBe('unknown');
  });
});
