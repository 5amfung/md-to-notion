import { test, expect, describe } from "bun:test";
import { parseArgs } from "./cli";

describe("parseArgs", () => {
  test("valid args with path and page ID", () => {
    const result = parseArgs(["path/to/file.md", "page-id"]);

    expect(result.inputPaths).toEqual(["path/to/file.md"]);
    expect(result.pageId).toBe("page-id");
    expect(result.options.force).toBe(false);
    expect(result.options.dryRun).toBe(false);
    expect(result.options.verbose).toBe(false);
  });

  test("multiple paths", () => {
    const result = parseArgs(["path1", "path2", "path3", "page-id"]);

    expect(result.inputPaths).toEqual(["path1", "path2", "path3"]);
    expect(result.pageId).toBe("page-id");
  });

  test("--force flag", () => {
    const result = parseArgs(["path.md", "page-id", "--force"]);

    expect(result.options.force).toBe(true);
    expect(result.options.dryRun).toBe(false);
    expect(result.options.verbose).toBe(false);
  });

  test("--dry-run flag", () => {
    const result = parseArgs(["path.md", "page-id", "--dry-run"]);

    expect(result.options.dryRun).toBe(true);
    expect(result.options.force).toBe(false);
    expect(result.options.verbose).toBe(false);
  });

  test("--verbose flag", () => {
    const result = parseArgs(["path.md", "page-id", "--verbose"]);

    expect(result.options.verbose).toBe(true);
    expect(result.options.force).toBe(false);
    expect(result.options.dryRun).toBe(false);
  });

  test("all flags", () => {
    const result = parseArgs(["path.md", "page-id", "--force", "--dry-run", "--verbose"]);

    expect(result.options.force).toBe(true);
    expect(result.options.dryRun).toBe(true);
    expect(result.options.verbose).toBe(true);
  });

  test("flags in different order", () => {
    const result = parseArgs(["--verbose", "--force", "path.md", "page-id", "--dry-run"]);

    expect(result.inputPaths).toEqual(["path.md"]);
    expect(result.pageId).toBe("page-id");
    expect(result.options.force).toBe(true);
    expect(result.options.dryRun).toBe(true);
    expect(result.options.verbose).toBe(true);
  });

  test("missing arguments error", () => {
    expect(() => parseArgs(["path.md"])).toThrow("Usage: md-to-notion");
  });

  test("empty args error", () => {
    expect(() => parseArgs([])).toThrow("Usage: md-to-notion");
  });

  test("only flags error", () => {
    expect(() => parseArgs(["--force", "--verbose"])).toThrow("Usage: md-to-notion");
  });

  test("multiple paths with flags", () => {
    const result = parseArgs(["dir1", "dir2", "page-id", "--force", "--verbose"]);

    expect(result.inputPaths).toEqual(["dir1", "dir2"]);
    expect(result.pageId).toBe("page-id");
    expect(result.options.force).toBe(true);
    expect(result.options.verbose).toBe(true);
  });
});

describe("run", () => {
  test("executes flow via subprocess (dry-run)", async () => {
    const { mkdtemp, rm, writeFile } = await import("fs/promises");
    const { join } = await import("path");
    const { tmpdir } = await import("os");
    const root = join(import.meta.dir, "..");
    const dir = await mkdtemp(join(tmpdir(), "md-to-notion-run-"));
    const mdPath = join(dir, "note.md");
    await writeFile(mdPath, "# Hello");
    try {
      const proc = Bun.spawn(["bun", "run", join(root, "src/cli.ts"), mdPath, "page-id", "--dry-run"], {
        cwd: root,
        env: { ...process.env, NOTION_API_KEY: "test-key" },
        stdout: "pipe",
        stderr: "pipe",
      });
      const exit = await proc.exited;
      const stderr = await new Response(proc.stderr).text();
      await rm(dir, { recursive: true, force: true });
      expect(exit).toBe(0);
      expect(stderr).toBe("");
    } catch (e) {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
      throw e;
    }
  });

  test("exits 1 when NOTION_API_KEY missing", async () => {
    const { join } = await import("path");
    const root = join(import.meta.dir, "..");
    const proc = Bun.spawn(["bun", "run", join(root, "src/cli.ts"), "/tmp/x.md", "page-id"], {
      cwd: root,
      env: { ...process.env, NOTION_API_KEY: "" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const exit = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    expect(exit).toBe(1);
    expect(stderr).toContain("NOTION_API_KEY");
  });

  test("verbose logs Import complete", async () => {
    const { mkdtemp, rm, writeFile } = await import("fs/promises");
    const { join } = await import("path");
    const { tmpdir } = await import("os");
    const root = join(import.meta.dir, "..");
    const dir = await mkdtemp(join(tmpdir(), "md-to-notion-run-"));
    const mdPath = join(dir, "note.md");
    await writeFile(mdPath, "# Hi");
    try {
      const proc = Bun.spawn(
        ["bun", "run", join(root, "src/cli.ts"), mdPath, "page-id", "--dry-run", "--verbose"],
        {
          cwd: root,
          env: { ...process.env, NOTION_API_KEY: "key" },
          stdout: "pipe",
          stderr: "pipe",
        }
      );
      const exit = await proc.exited;
      const out = await new Response(proc.stdout).text();
      await rm(dir, { recursive: true, force: true });
      expect(exit).toBe(0);
      expect(out).toContain("Import complete");
    } catch (e) {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
      throw e;
    }
  });
});
