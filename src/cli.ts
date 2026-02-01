#!/usr/bin/env bun
import { importMarkdown } from './page-creator';
import { scanInput, scanMultipleInputs } from './scanner';

type CliOptions = {
  force: boolean;
  dryRun: boolean;
  verbose: boolean;
};

export function parseArgs(args: string[]): {
  inputPaths: string[];
  pageId: string;
  options: CliOptions;
} {
  const options: CliOptions = {
    force: false,
    dryRun: false,
    verbose: false,
  };

  const positional: string[] = [];
  for (const arg of args) {
    if (arg === '--force') options.force = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--verbose') options.verbose = true;
    else positional.push(arg);
  }

  if (positional.length < 2) {
    throw new Error(
      'Usage: md-to-notion <path...> <destination_page_id> [--force] [--dry-run] [--verbose]'
    );
  }

  // Last positional argument is the page ID, rest are input paths
  const lastArg = positional[positional.length - 1];
  if (lastArg === undefined) {
    throw new Error('Missing required page ID and input path(s).');
  }
  const pageId = lastArg;
  const inputPaths = positional.slice(0, -1);

  return {
    inputPaths,
    pageId,
    options,
  };
}

export async function run(): Promise<void> {
  try {
    const { inputPaths, pageId, options } = parseArgs(process.argv.slice(2));
    if (!process.env.NOTION_API_KEY) {
      throw new Error('Missing NOTION_API_KEY environment variable.');
    }
    const singlePath = inputPaths[0];
    const scan =
      inputPaths.length === 1 && singlePath !== undefined
        ? await scanInput(singlePath)
        : await scanMultipleInputs(inputPaths);
    await importMarkdown(scan, pageId, options);
    if (options.verbose) {
      console.log('Import complete.');
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Only run when executed directly, not when imported
if (import.meta.main) {
  run();
}
