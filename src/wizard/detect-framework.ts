import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface DetectedFramework {
  name: 'next' | 'vite' | 'cra' | 'remix' | 'astro' | 'unknown';
  displayName: string;
  srcDir: string;
  defaultInclude: string;
}

const FRAMEWORKS: { pkg: string; name: DetectedFramework['name']; displayName: string; srcDirs: string[]; defaultInclude: string }[] = [
  { pkg: 'next', name: 'next', displayName: 'Next.js', srcDirs: ['app', 'src'], defaultInclude: 'src/**/*.tsx' },
  { pkg: 'vite', name: 'vite', displayName: 'Vite', srcDirs: ['src'], defaultInclude: 'src/**/*.tsx' },
  { pkg: 'react-scripts', name: 'cra', displayName: 'Create React App', srcDirs: ['src'], defaultInclude: 'src/**/*.tsx' },
  { pkg: '@remix-run/react', name: 'remix', displayName: 'Remix', srcDirs: ['app', 'src'], defaultInclude: 'app/**/*.tsx' },
  { pkg: 'astro', name: 'astro', displayName: 'Astro', srcDirs: ['src'], defaultInclude: 'src/**/*.{tsx,astro}' },
];

export function detectFramework(cwd: string): DetectedFramework {
  try {
    const pkgJson = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf-8'));
    const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };

    for (const fw of FRAMEWORKS) {
      if (allDeps[fw.pkg]) {
        const srcDir = fw.srcDirs.find(d => existsSync(join(cwd, d))) || fw.srcDirs[0];
        return {
          name: fw.name,
          displayName: fw.displayName,
          srcDir,
          defaultInclude: fw.defaultInclude,
        };
      }
    }
  } catch {
    // package.json not found or invalid
  }

  const srcDir = existsSync(join(cwd, 'src')) ? 'src' : '.';
  return {
    name: 'unknown',
    displayName: 'Unknown',
    srcDir,
    defaultInclude: 'src/**/*.tsx',
  };
}
