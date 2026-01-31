import path from "path";
import { createHash } from "crypto";
import { Client } from "@notionhq/client";
import type { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";
import { toRelativePath } from "./scanner";
import type { ScanResult } from "./scanner";
import { loadSyncState, saveSyncState } from "./sync-state";
import type { SyncState } from "./sync-state";
import { parseMarkdown } from "./parser";
import { buildNotionBlocks } from "./notion/blocks";
import { createNotionClient, createPageWithBlocks, replacePageBlocks } from "./notion/client";
import { uploadFile } from "./notion/upload";

type ImportOptions = {
  dryRun?: boolean;
  force?: boolean;
  verbose?: boolean;
};

function log(message: string, verbose?: boolean) {
  if (verbose) {
    console.log(message);
  }
}

async function computeHash(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256");
  hash.update(buffer);
  return hash.digest("hex");
}

function getRootKey(): string {
  return ".";
}

function getParentKey(relativeDir: string): string {
  const parent = path.dirname(relativeDir);
  return parent === "." ? getRootKey() : parent;
}

async function ensureDirectoryPages(
  notion: Client,
  state: SyncState,
  scan: ScanResult,
  destinationPageId: string,
  options: ImportOptions
): Promise<string> {
  const rootKey = getRootKey();
  
  // If createRootPage is false, the root maps directly to destination
  if (!scan.createRootPage) {
    if (!state.directories[rootKey]) {
      state.directories[rootKey] = { notionPageId: destinationPageId };
      await saveSyncState(state);
    }
  } else if (!state.directories[rootKey]) {
    if (options.dryRun) {
      log(`[dry-run] create root dir page: ${scan.rootName}`, options.verbose);
      state.directories[rootKey] = { notionPageId: "dry-run" };
    } else {
      const rootPageId = await createPageWithBlocks(notion, destinationPageId, scan.rootName, []);
      state.directories[rootKey] = { notionPageId: rootPageId };
      await saveSyncState(state);
    }
  }

  const sortedDirs = scan.directories
    .map((dir) => toRelativePath(scan.rootDir, dir))
    .filter((rel) => rel && rel !== "." && rel !== rootKey)
    .sort((a, b) => a.length - b.length);

  for (const relativeDir of sortedDirs) {
    if (state.directories[relativeDir]) continue;
    const parentKey = getParentKey(relativeDir);
    const parentId = state.directories[parentKey]?.notionPageId;
    if (!parentId) {
      throw new Error(`Missing parent directory mapping for ${relativeDir}`);
    }

    if (options.dryRun) {
      log(`[dry-run] create dir page: ${relativeDir}`, options.verbose);
      state.directories[relativeDir] = { notionPageId: "dry-run" };
      continue;
    }

    const title = path.basename(relativeDir);
    const pageId = await createPageWithBlocks(notion, parentId, title, []);
    state.directories[relativeDir] = { notionPageId: pageId };
    await saveSyncState(state);
  }

  return state.directories[rootKey].notionPageId;
}

async function buildBlocksForFile(
  notion: Client,
  filePath: string,
  options?: { verbose?: boolean }
): Promise<BlockObjectRequest[]> {
  const content = await Bun.file(filePath).text();
  const parsedBlocks = parseMarkdown(content, filePath);
  return buildNotionBlocks(parsedBlocks, {
    uploadLocalImage: async (imagePath) => uploadFile(notion, imagePath, { verbose: options?.verbose }),
    missingImagePlaceholder: (imagePath) => ({
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: `[Missing image: ${imagePath}]` } }],
      },
    }),
  });
}

export async function importMarkdown(
  scan: ScanResult,
  destinationPageId: string,
  options: ImportOptions
): Promise<void> {
  if (scan.isDirectory && scan.mdFiles.length === 0) {
    log("No markdown files found. Nothing to import.", options.verbose);
    return;
  }

  const notion = createNotionClient();
  const state = await loadSyncState(destinationPageId);

  let rootPageId = destinationPageId;
  if (scan.isDirectory) {
    rootPageId = await ensureDirectoryPages(notion, state, scan, destinationPageId, options);
  }

  for (const filePath of scan.mdFiles) {
    const relativePath = scan.isDirectory
      ? toRelativePath(scan.rootDir, filePath)
      : path.basename(filePath);
    const fileHash = await computeHash(filePath);
    const existing = state.files[relativePath];
    const shouldUpdate = options.force || !existing || existing.contentHash !== fileHash;

    if (!shouldUpdate) {
      log(`skip: ${relativePath}`, options.verbose);
      continue;
    }

    const title = path.basename(filePath, ".md");
    const fileDir = path.dirname(relativePath);
    const parentKey = fileDir === "." ? getRootKey() : fileDir;
    const parentPageId = scan.isDirectory
      ? state.directories[parentKey]?.notionPageId
      : rootPageId;

    if (!parentPageId) {
      throw new Error(`Missing parent page for ${relativePath}`);
    }

    if (options.dryRun) {
      log(`[dry-run] ${existing ? "update" : "create"}: ${relativePath}`, options.verbose);
      continue;
    }

    const blocks = await buildBlocksForFile(notion, filePath, { verbose: options.verbose });

    let pageId = existing?.notionPageId;
    if (pageId) {
      await replacePageBlocks(notion, pageId, blocks);
      log(`updated: ${relativePath}`, options.verbose);
    } else {
      pageId = await createPageWithBlocks(notion, parentPageId, title, blocks);
      log(`created: ${relativePath}`, options.verbose);
    }

    state.files[relativePath] = {
      notionPageId: pageId,
      contentHash: fileHash,
      lastSynced: new Date().toISOString(),
    };
    await saveSyncState(state);
  }
}
