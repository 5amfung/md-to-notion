import path from "path";

export type SyncState = {
  destinationPageId: string;
  files: Record<
    string,
    {
      notionPageId: string;
      contentHash: string;
      lastSynced: string;
    }
  >;
  directories: Record<
    string,
    {
      notionPageId: string;
    }
  >;
};

export function getStatePath(): string {
  return path.join(process.cwd(), ".notion-sync.json");
}

export async function loadSyncState(
  destinationPageId: string
): Promise<SyncState> {
  const statePath = getStatePath();
  const file = Bun.file(statePath);
  if (await file.exists()) {
    const content = await file.text();
    const parsed = JSON.parse(content) as SyncState;
    if (parsed.destinationPageId !== destinationPageId) {
      throw new Error(
        `Destination page ID mismatch: expected ${parsed.destinationPageId}, got ${destinationPageId}`
      );
    }
    return parsed;
  }

  return {
    destinationPageId,
    files: {},
    directories: {},
  };
}

export async function saveSyncState(state: SyncState): Promise<void> {
  const statePath = getStatePath();
  await Bun.write(statePath, JSON.stringify(state, null, 2));
}
