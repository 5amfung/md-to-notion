import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

export type ScanResult = {
  inputPath: string;
  isDirectory: boolean;
  rootDir: string;
  rootName: string;
  mdFiles: string[];
  directories: string[];
  createRootPage: boolean; // Whether to create a wrapper page for the root
};

const SCAN_PROGRESS_INTERVAL = 100;

function log(message: string, verbose?: boolean) {
  if (verbose) {
    console.log(message);
  }
}

function logProgress(count: number, verbose?: boolean) {
  if (verbose && count % SCAN_PROGRESS_INTERVAL === 0) {
    console.log(`Found ${count} markdown files so far...`);
  }
}

async function collectMarkdownFiles(
  dir: string,
  files: string[],
  options?: { verbose?: boolean; progress?: { mdFiles: number } }
): Promise<void> {
  log(`Scanning directory: ${dir}`, options?.verbose);
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectMarkdownFiles(fullPath, files, options);
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name.endsWith('.canvas')) continue;
    if (entry.name.endsWith('.md')) {
      files.push(fullPath);
      if (options?.progress) {
        options.progress.mdFiles += 1;
        logProgress(options.progress.mdFiles, options.verbose);
      }
    }
  }
}

function deriveDirectories(rootDir: string, mdFiles: string[]): string[] {
  const dirSet = new Set<string>();
  for (const file of mdFiles) {
    let current = path.dirname(file);
    while (current.startsWith(rootDir)) {
      dirSet.add(current);
      const parent = path.dirname(current);
      if (parent === current) break;
      if (current === rootDir) break;
      current = parent;
    }
  }
  return Array.from(dirSet).sort((a, b) => a.length - b.length);
}

export async function scanInput(
  inputPath: string,
  verbose = false
): Promise<ScanResult> {
  const resolved = path.resolve(inputPath);
  const stats = await stat(resolved);
  if (stats.isFile()) {
    if (!resolved.endsWith('.md')) {
      throw new Error(`Input file must be .md: ${resolved}`);
    }
    log(`Scanning file: ${resolved}`, verbose);
    log('Scan complete: 1 markdown files.', verbose);
    return {
      inputPath: resolved,
      isDirectory: false,
      rootDir: path.dirname(resolved),
      rootName: path.basename(resolved, '.md'),
      mdFiles: [resolved],
      directories: [],
      createRootPage: false, // Single file doesn't need a root page
    };
  }

  if (!stats.isDirectory()) {
    throw new Error(`Input path is not a file or directory: ${resolved}`);
  }

  const mdFiles: string[] = [];
  const progress = { mdFiles: 0 };
  await collectMarkdownFiles(resolved, mdFiles, { verbose, progress });

  const directories = deriveDirectories(resolved, mdFiles);
  log(
    `Scan complete: ${mdFiles.length} markdown files across ${directories.length} directories.`,
    verbose
  );
  return {
    inputPath: resolved,
    isDirectory: true,
    rootDir: resolved,
    rootName: path.basename(resolved),
    mdFiles,
    directories,
    createRootPage: true, // Single directory creates a wrapper page
  };
}

export async function scanMultipleInputs(
  inputPaths: string[],
  verbose = false
): Promise<ScanResult> {
  if (inputPaths.length === 0) {
    throw new Error('No input paths provided');
  }

  if (inputPaths.length === 1) {
    const single = inputPaths[0];
    if (single === undefined) throw new Error('No input paths provided');
    return scanInput(single, verbose);
  }

  // Multiple inputs: find common parent directory
  const resolvedPaths = inputPaths
    .map((p) => path.resolve(p))
    .filter((p) => !p.endsWith('.notion-sync.json')); // Skip sync state files

  if (resolvedPaths.length === 0) {
    throw new Error('No valid input paths provided');
  }

  // Determine the common parent directory
  const firstPath = resolvedPaths[0];
  if (firstPath === undefined) throw new Error('No valid input paths provided');
  let commonParent = path.dirname(firstPath);
  for (const p of resolvedPaths) {
    while (!p.startsWith(commonParent + path.sep) && p !== commonParent) {
      commonParent = path.dirname(commonParent);
    }
  }

  const mdFiles: string[] = [];
  const subDirs: string[] = [];
  const progress = { mdFiles: 0 };

  for (const resolved of resolvedPaths) {
    try {
      const stats = await stat(resolved);
      if (stats.isFile()) {
        if (resolved.endsWith('.md')) {
          mdFiles.push(resolved);
          progress.mdFiles += 1;
          logProgress(progress.mdFiles, verbose);
        }
      } else if (stats.isDirectory()) {
        subDirs.push(resolved);
        await collectMarkdownFiles(resolved, mdFiles, { verbose, progress });
      }
    } catch {
      // Skip paths that don't exist
    }
  }

  // Derive directories from subdirs and md files, relative to common parent
  const allDirectories = deriveDirectories(commonParent, mdFiles);
  // Filter to only include the input subdirs and their children
  const relevantDirs = allDirectories.filter((dir) =>
    subDirs.some(
      (subDir) => dir === subDir || dir.startsWith(subDir + path.sep)
    )
  );

  log(
    `Scan complete: ${mdFiles.length} markdown files across ${relevantDirs.length} directories.`,
    verbose
  );
  return {
    inputPath: commonParent,
    isDirectory: true,
    rootDir: commonParent,
    rootName: path.basename(commonParent),
    mdFiles,
    directories: relevantDirs,
    createRootPage: false, // Multiple inputs go directly under destination
  };
}

export function toRelativePath(rootDir: string, targetPath: string): string {
  return path.relative(rootDir, targetPath);
}
