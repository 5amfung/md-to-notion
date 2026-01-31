import { Client } from "@notionhq/client";
import type { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";

const MAX_BLOCKS_PER_REQUEST = 100;

export function createNotionClient(): Client {
  return new Client({ auth: process.env.NOTION_API_KEY });
}

export async function createPageWithBlocks(
  notion: Client,
  parentPageId: string,
  title: string,
  blocks: BlockObjectRequest[]
): Promise<string> {
  const page = await notion.pages.create({
    parent: { page_id: parentPageId },
    properties: {
      title: {
        title: [{ text: { content: title } }],
      },
    },
    children: blocks.slice(0, MAX_BLOCKS_PER_REQUEST),
  });

  for (let i = MAX_BLOCKS_PER_REQUEST; i < blocks.length; i += MAX_BLOCKS_PER_REQUEST) {
    await notion.blocks.children.append({
      block_id: page.id,
      children: blocks.slice(i, i + MAX_BLOCKS_PER_REQUEST),
    });
  }

  return page.id;
}

export async function appendBlocks(
  notion: Client,
  blockId: string,
  blocks: BlockObjectRequest[]
): Promise<void> {
  for (let i = 0; i < blocks.length; i += MAX_BLOCKS_PER_REQUEST) {
    await notion.blocks.children.append({
      block_id: blockId,
      children: blocks.slice(i, i + MAX_BLOCKS_PER_REQUEST),
    });
  }
}

export async function listAllBlocks(
  notion: Client,
  blockId: string
): Promise<string[]> {
  const blockIds: string[] = [];
  let cursor: string | undefined;
  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const child of response.results) {
      if ("id" in child) {
        blockIds.push(child.id);
      }
    }
    cursor = response.has_more ? response.next_cursor || undefined : undefined;
  } while (cursor);
  return blockIds;
}

export async function replacePageBlocks(
  notion: Client,
  pageId: string,
  blocks: BlockObjectRequest[]
): Promise<void> {
  const existingBlocks = await listAllBlocks(notion, pageId);
  for (const blockId of existingBlocks) {
    await notion.blocks.delete({ block_id: blockId });
  }
  await appendBlocks(notion, pageId, blocks);
}
