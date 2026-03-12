import { readFileSync, existsSync } from 'fs';
import { join, relative, basename, extname } from 'path';
import { sync as globSync } from 'glob';

export interface DetectedElementRule {
  htmlElement: string;
  componentName: string;
  importPath: string;
}

const TARGET_ELEMENTS = [
  'button', 'input', 'a', 'select', 'textarea',
  'img', 'form', 'label', 'dialog', 'table',
];

const SEARCH_DIRS = [
  'src/components/ui',
  'src/components',
  'components/ui',
  'components',
  'app/components',
  'src/ui',
  'lib/components',
];

const SKIP_PATTERNS = ['*.test.*', '*.spec.*', '*.stories.*', '__tests__/**'];

export function scanComponents(cwd: string): DetectedElementRule[] {
  const hasPathAlias = checkPathAlias(cwd);
  const existingDirs = SEARCH_DIRS.filter(d => existsSync(join(cwd, d)));

  if (existingDirs.length === 0) return [];

  // Collect all component files and read them once
  const componentFiles = new Set<string>();
  for (const dir of existingDirs) {
    const files = globSync('**/*.{tsx,jsx}', {
      cwd: join(cwd, dir),
      absolute: true,
      ignore: SKIP_PATTERNS,
    });
    files.forEach(f => componentFiles.add(f));
  }

  // Cache file contents to avoid re-reading for each element
  const fileContents = new Map<string, string>();
  for (const filePath of componentFiles) {
    const fileName = basename(filePath, extname(filePath));
    // Only consider files starting with uppercase (React components)
    if (!/^[A-Z]/.test(fileName)) continue;
    try {
      fileContents.set(filePath, readFileSync(filePath, 'utf-8'));
    } catch {
      continue;
    }
  }

  const results: DetectedElementRule[] = [];

  for (const element of TARGET_ELEMENTS) {
    const match = findComponentForElement(element, fileContents, cwd);
    if (match) {
      results.push({
        htmlElement: element,
        componentName: match.componentName,
        importPath: deriveImportPath(match.filePath, cwd, hasPathAlias),
      });
    }
  }

  return results;
}

function findComponentForElement(
  element: string,
  fileContents: Map<string, string>,
  cwd: string
): { componentName: string; filePath: string } | null {
  const regex = new RegExp(`<${element}[\\s/>]`);
  const candidates: { componentName: string; filePath: string; score: number }[] = [];

  for (const [filePath, content] of fileContents) {
    if (regex.test(content)) {
      const fileName = basename(filePath, extname(filePath));
      const relativePath = relative(cwd, filePath);
      const isUiDir = relativePath.includes('/ui/');
      const score = (isUiDir ? 0 : 100) + relativePath.length;
      candidates.push({ componentName: fileName, filePath, score });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.score - b.score);
  return candidates[0];
}

function checkPathAlias(cwd: string): boolean {
  try {
    const tsconfig = JSON.parse(readFileSync(join(cwd, 'tsconfig.json'), 'utf-8'));
    const paths = tsconfig.compilerOptions?.paths || {};
    return Object.keys(paths).some(k => k.startsWith('@/'));
  } catch {
    return false;
  }
}

function deriveImportPath(filePath: string, cwd: string, hasPathAlias: boolean): string {
  const rel = relative(cwd, filePath);
  const withoutExt = rel.replace(/\.(tsx|jsx)$/, '');
  const importPath = withoutExt.replace(/\/index$/, '');

  if (hasPathAlias && importPath.startsWith('src/')) {
    return '@/' + importPath.slice(4);
  }

  return './' + importPath;
}
