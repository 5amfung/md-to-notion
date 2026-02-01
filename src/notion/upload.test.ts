import { test, expect, mock, spyOn, beforeEach, afterEach, describe } from "bun:test";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { Client } from "@notionhq/client";
import { uploadFile, guessContentType, splitIntoChunks } from "./upload";

let testDir: string;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "md-to-notion-test-"));
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("guessContentType", () => {
  test("PNG", () => {
  expect(guessContentType("image.png")).toBe("image/png");
  expect(guessContentType("IMAGE.PNG")).toBe("image/png");
  });

  test("JPEG", () => {
  expect(guessContentType("image.jpg")).toBe("image/jpeg");
  expect(guessContentType("image.jpeg")).toBe("image/jpeg");
  expect(guessContentType("IMAGE.JPG")).toBe("image/jpeg");
  });

  test("GIF", () => {
  expect(guessContentType("image.gif")).toBe("image/gif");
  });

  test("WebP", () => {
  expect(guessContentType("image.webp")).toBe("image/webp");
  });

  test("SVG", () => {
  expect(guessContentType("image.svg")).toBe("image/svg+xml");
  });

  test("unknown extension", () => {
  expect(guessContentType("file.unknown")).toBe("application/octet-stream");
  expect(guessContentType("file")).toBe("application/octet-stream");
  });
});

describe("splitIntoChunks", () => {
  test("splits buffer correctly", () => {
  const buffer = Buffer.alloc(25 * 1024 * 1024); // 25 MB
  const chunks = splitIntoChunks(buffer, 10 * 1024 * 1024); // 10 MB chunks

  expect(chunks.length).toBe(3);
  expect(chunks[0]!.length).toBe(10 * 1024 * 1024);
  expect(chunks[1]!.length).toBe(10 * 1024 * 1024);
  expect(chunks[2]!.length).toBe(5 * 1024 * 1024);
  });

  test("exact chunk size", () => {
  const buffer = Buffer.alloc(20 * 1024 * 1024); // 20 MB
  const chunks = splitIntoChunks(buffer, 10 * 1024 * 1024); // 10 MB chunks

  expect(chunks.length).toBe(2);
  expect(chunks[0]!.length).toBe(10 * 1024 * 1024);
  expect(chunks[1]!.length).toBe(10 * 1024 * 1024);
  });

  test("smaller than chunk size", () => {
  const buffer = Buffer.alloc(5 * 1024 * 1024); // 5 MB
  const chunks = splitIntoChunks(buffer, 10 * 1024 * 1024); // 10 MB chunks

  expect(chunks.length).toBe(1);
  expect(chunks[0]!.length).toBe(5 * 1024 * 1024);
  });
});

describe("uploadFile", () => {
  test("small file (single-part upload)", async () => {
  const filePath = join(testDir, "small.png");
  const fileContent = Buffer.alloc(5 * 1024 * 1024); // 5 MB
  await writeFile(filePath, fileContent);

  const mockClient = {
    fileUploads: {
      create: mock(() =>
        Promise.resolve({
          id: "upload-id",
        })
      ),
      send: mock(() => Promise.resolve({})),
    },
  } as unknown as Client;

  const uploadId = await uploadFile(mockClient, filePath);

  expect(uploadId).toBe("upload-id");
  expect(mockClient.fileUploads.create).toHaveBeenCalledTimes(1);
  expect(mockClient.fileUploads.create).toHaveBeenCalledWith({
    mode: "single_part",
    filename: "small.png",
    content_type: "image/png",
  });
  expect(mockClient.fileUploads.send).toHaveBeenCalledTimes(1);
  });

  test("large file (multi-part upload)", async () => {
  const filePath = join(testDir, "large.png");
  const fileContent = Buffer.alloc(25 * 1024 * 1024); // 25 MB
  await writeFile(filePath, fileContent);

  const mockClient = {
    fileUploads: {
      create: mock(() =>
        Promise.resolve({
          id: "upload-id",
        })
      ),
      send: mock(() => Promise.resolve({})),
      complete: mock(() => Promise.resolve({})),
    },
  } as unknown as Client;

  const uploadId = await uploadFile(mockClient, filePath);

  expect(uploadId).toBe("upload-id");
  expect(mockClient.fileUploads.create).toHaveBeenCalledTimes(1);
  expect(mockClient.fileUploads.create).toHaveBeenCalledWith({
    mode: "multi_part",
    number_of_parts: 3, // 25 MB / 10 MB = 3 parts
    filename: "large.png",
    content_type: "image/png",
  });
  // Should send 3 parts
  expect(mockClient.fileUploads.send).toHaveBeenCalledTimes(3);
  expect(mockClient.fileUploads.complete).toHaveBeenCalledTimes(1);
  expect(mockClient.fileUploads.complete).toHaveBeenCalledWith({
    file_upload_id: "upload-id",
  });
  });

  test("exactly 20 MB (single-part)", async () => {
  const filePath = join(testDir, "exact.png");
  const fileContent = Buffer.alloc(20 * 1024 * 1024); // Exactly 20 MB
  await writeFile(filePath, fileContent);

  const mockClient = {
    fileUploads: {
      create: mock(() =>
        Promise.resolve({
          id: "upload-id",
        })
      ),
      send: mock(() => Promise.resolve({})),
    },
  } as unknown as Client;

  const uploadId = await uploadFile(mockClient, filePath);

  expect(uploadId).toBe("upload-id");
  expect(mockClient.fileUploads.create).toHaveBeenCalledWith({
    mode: "single_part",
    filename: "exact.png",
    content_type: "image/png",
  });
  });

  test("verbose logging", async () => {
  const filePath = join(testDir, "test.png");
  const fileContent = Buffer.alloc(5 * 1024 * 1024); // 5 MB
  await writeFile(filePath, fileContent);

  const consoleSpy = spyOn(console, "log").mockImplementation(() => {});

  const mockClient = {
    fileUploads: {
      create: mock(() =>
        Promise.resolve({
          id: "upload-id",
        })
      ),
      send: mock(() => Promise.resolve({})),
    },
  } as unknown as Client;

  await uploadFile(mockClient, filePath, { verbose: true });

  expect(consoleSpy).toHaveBeenCalled();
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("uploading image: test.png")
  );

  consoleSpy.mockRestore();
  });

  test("uses file type from Bun.file", async () => {
  const filePath = join(testDir, "test.jpg");
  const fileContent = Buffer.alloc(1024);
  await writeFile(filePath, fileContent);

  const mockClient = {
    fileUploads: {
      create: mock(() =>
        Promise.resolve({
          id: "upload-id",
        })
      ),
      send: mock(() => Promise.resolve({})),
    },
  } as unknown as Client;

  await uploadFile(mockClient, filePath);

  expect(mockClient.fileUploads.create).toHaveBeenCalledWith(
    expect.objectContaining({
      content_type: "image/jpeg",
    })
  );
  });
});
