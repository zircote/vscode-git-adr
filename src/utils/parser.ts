import { AdrListItem, normalizeAdrListItem } from '../models/adrListItem';

/**
 * @deprecated Use `AdrListItem` from `../models/adrListItem` instead.
 * This type alias is preserved for backward compatibility.
 */
export type AdrListEntry = AdrListItem;

// Re-export AdrListItem for convenience
export { AdrListItem } from '../models/adrListItem';

/**
 * Parse JSON output from `git adr list -f json`.
 *
 * @param output - Raw stdout from CLI (expected to be JSON array)
 * @returns Array of normalized AdrListItem objects
 * @throws {SyntaxError} If output is not valid JSON
 * @throws {Error} If output is not a JSON array
 *
 * @example
 * ```typescript
 * const json = '[{"id": "001", "title": "My ADR"}]';
 * const items = parseAdrListJson(json);
 * ```
 */
export function parseAdrListJson(output: string): AdrListItem[] {
  const trimmed = output.trim();

  // Handle empty output
  if (!trimmed) {
    return [];
  }

  // Sanitize JSON: escape unescaped control characters in string literals
  // This handles malformed JSON from git-adr where newlines in titles aren't escaped
  const sanitized = trimmed.replace(
    /"([^"\\]*(\\.[^"\\]*)*)"/g,
    (match) => {
      // Replace literal newlines/tabs/etc with escaped versions inside strings
      return match
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
    }
  );

  const parsed: unknown = JSON.parse(sanitized);

  // Validate it's an array
  if (!Array.isArray(parsed)) {
    throw new Error('Expected JSON array from git adr list -f json');
  }

  // Normalize each item
  return parsed.map((item) => normalizeAdrListItem(item as Record<string, unknown>));
}

/**
 * Parse text output from `git adr list` (fallback parser).
 *
 * This parser uses regex heuristics to extract ADR entries from unstructured
 * text output. It's used as a fallback when JSON format is unavailable.
 *
 * @param output - Raw stdout from CLI (text format)
 * @returns Array of AdrListItem objects with basic fields populated
 */
export function parseAdrList(output: string): AdrListItem[] {
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
