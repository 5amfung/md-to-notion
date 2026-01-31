import path from "path";
import { Client } from "@notionhq/client";

const TWENTY_MB = 20 * 1024 * 1024;
const TEN_MB = 10 * 1024 * 1024;

function guessContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function splitIntoChunks(buffer: Buffer, chunkSize: number): Buffer[] {
  const chunks: Buffer[] = [];
  for (let i = 0; i < buffer.length; i += chunkSize) {
    chunks.push(buffer.subarray(i, i + chunkSize));
  }
  return chunks;
}

async function uploadSmallFile(
  notion: Client,
  data: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const upload = await notion.fileUploads.create({
    mode: "single_part",
    filename,
    content_type: contentType,
  });

  await notion.fileUploads.send({
    file_upload_id: upload.id,
    file: {
      filename,
      data: new Blob([data], { type: contentType }),
    },
  });

  return upload.id;
}

async function uploadLargeFile(
  notion: Client,
  data: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const parts = splitIntoChunks(data, TEN_MB);
  const upload = await notion.fileUploads.create({
    mode: "multi_part",
    number_of_parts: parts.length,
    filename,
    content_type: contentType,
  });

  await Promise.all(
    parts.map((chunk, index) =>
      notion.fileUploads.send({
        file_upload_id: upload.id,
        part_number: String(index + 1),
        file: {
          filename,
          data: new Blob([chunk], { type: contentType }),
        },
      })
    )
  );

  await notion.fileUploads.complete({ file_upload_id: upload.id });
  return upload.id;
}

export type UploadOptions = {
  verbose?: boolean;
};

export async function uploadFile(
  notion: Client,
  filePath: string,
  options?: UploadOptions
): Promise<string> {
  const file = Bun.file(filePath);
  const data = Buffer.from(await file.arrayBuffer());
  const filename = path.basename(filePath);
  const contentType = file.type || guessContentType(filePath);
  const fileSize = file.size;

  if (options?.verbose) {
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    console.log(`uploading image: ${filename} (${sizeMB} MB)`);
  }

  if (fileSize <= TWENTY_MB) {
    return uploadSmallFile(notion, data, filename, contentType);
  }
  return uploadLargeFile(notion, data, filename, contentType);
}
