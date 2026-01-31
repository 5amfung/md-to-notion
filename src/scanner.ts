import path from "path";
import { readdir, stat } from "fs/promises";

export type ScanResult = {
  inputPath: string;
  isDirectory: boolean;
  rootDir: string;
  rootName: string;
  mdFiles: string[];
  directories: string[];
  createRootPage: boolean; // Whether to create a wrapper page for the root
};

async function collectMarkdownFiles(dir: string, files: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectMarkdownFiles(fullPath, files);
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name.endsWith(".canvas")) continue;
    if (entry.name.endsWith(".md")) {
      files.push(fullPath);
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

export async function scanInput(inputPath: string): Promise<ScanResult> {
  const resolved = path.resolve(inputPath);
  const stats = await stat(resolved);
  if (stats.isFile()) {
    if (!resolved.endsWith(".md")) {
      throw new Error(`Input file must be .md: ${resolved}`);
    }
    return {
      inputPath: resolved,
      isDirectory: false,
      rootDir: path.dirname(resolved),
      rootName: path.basename(resolved, ".md"),
      mdFiles: [resolved],
      directories: [],
      createRootPage: false, // Single file doesn't need a root page
    };
  }

  if (!stats.isDirectory()) {
    throw new Error(`Input path is not a file or directory: ${resolved}`);
  }

  const mdFiles: string[] = [];
  await collectMarkdownFiles(resolved, mdFiles);

  const directories = deriveDirectories(resolved, mdFiles);
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

export async function scanMultipleInputs(inputPaths: string[]): Promise<ScanResult> {
  if (inputPaths.length === 0) {
    throw new Error("No input paths provided");
  }

  if (inputPaths.length === 1) {
    return scanInput(inputPaths[0]!);
  }

  // Multiple inputs: find common parent directory
  const resolvedPaths = inputPaths
    .map((p) => path.resolve(p))
    .filter((p) => !p.endsWith(".notion-sync.json")); // Skip sync state files

  if (resolvedPaths.length === 0) {
    throw new Error("No valid input paths provided");
  }

  // Determine the common parent directory
  const firstPath = resolvedPaths[0]!;
  let commonParent = path.dirname(firstPath);
  for (const p of resolvedPaths) {
    while (!p.startsWith(commonParent + path.sep) && p !== commonParent) {
      commonParent = path.dirname(commonParent);
    }
  }

  const mdFiles: string[] = [];
  const subDirs: string[] = [];

  for (const resolved of resolvedPaths) {
    try {
      const stats = await stat(resolved);
      if (stats.isFile()) {
        if (resolved.endsWith(".md")) {
          mdFiles.push(resolved);
        }
      } else if (stats.isDirectory()) {
        subDirs.push(resolved);
        await collectMarkdownFiles(resolved, mdFiles);
      }
    } catch {
      // Skip paths that don't exist
      continue;
    }
  }

  // Derive directories from subdirs and md files, relative to common parent
  const allDirectories = deriveDirectories(commonParent, mdFiles);
  // Filter to only include the input subdirs and their children
  const relevantDirs = allDirectories.filter((dir) =>
    subDirs.some((subDir) => dir === subDir || dir.startsWith(subDir + path.sep))
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
