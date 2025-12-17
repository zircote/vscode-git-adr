export interface AdrListEntry {
  id: string;
  title: string;
  date?: string;
  status?: string;
  raw?: string;
}

export function parseAdrList(output: string): AdrListEntry[] {
  const entries: AdrListEntry[] = [];
  const lines = output.trim().split('\n');

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    // Try to parse structured output
    // Expected format variations:
    // 1. "<id> <title>"
    // 2. "<id> | <title>"
    // 3. "<id>: <title>"
    // 4. Full line as raw if no clear pattern

    const pipeMatch = line.match(/^([^\s|]+)\s*\|\s*(.+)$/);
    if (pipeMatch) {
      entries.push({
        id: pipeMatch[1].trim(),
        title: pipeMatch[2].trim(),
        raw: line,
      });
      continue;
    }

    const colonMatch = line.match(/^([^\s:]+)\s*:\s*(.+)$/);
    if (colonMatch) {
      entries.push({
        id: colonMatch[1].trim(),
        title: colonMatch[2].trim(),
        raw: line,
      });
      continue;
    }

    const spaceMatch = line.match(/^([^\s]+)\s+(.+)$/);
    if (spaceMatch) {
      entries.push({
        id: spaceMatch[1].trim(),
        title: spaceMatch[2].trim(),
        raw: line,
      });
      continue;
    }

    // Fallback: use the whole line as ID and title
    entries.push({
      id: line.trim(),
      title: line.trim(),
      raw: line,
    });
  }

  return entries;
}
