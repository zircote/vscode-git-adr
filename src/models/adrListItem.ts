/**
 * Canonical data model for ADR list items from `git adr list -f json`.
 *
 * This interface serves as the single source of truth for ADR metadata
 * throughout the extension. All components (parser, CLI, tree provider)
 * should use this interface for type safety and consistency.
 */

/**
 * Represents a single ADR entry from the `git adr list -f json` output.
 *
 * @example
 * ```json
 * {
 *   "id": "20251217-rename-homebrew-tap",
 *   "title": "Rename Homebrew tap to follow naming conventions",
 *   "status": "proposed",
 *   "date": "2025-12-17",
 *   "tags": ["infrastructure"],
 *   "linked_commits": ["abc123"],
 *   "supersedes": null,
 *   "superseded_by": null
 * }
 * ```
 */
export interface AdrListItem {
  /** Unique identifier for the ADR (e.g., "20251217-rename-homebrew-tap") */
  id: string;

  /** Human-readable title of the ADR */
  title: string;

  /** Current status (e.g., "accepted", "proposed", "deprecated", "superseded") */
  status?: string;

  /** Creation date in ISO format (YYYY-MM-DD) */
  date?: string;

  /** Labels/categories for the ADR */
  tags?: string[];

  /** Git commit SHAs linked to this ADR */
  linked_commits?: string[];

  /**
   * ID of the ADR that this one supersedes.
   * - `undefined`: field not provided in JSON
   * - `null`: explicitly set to no value
   * - `string`: ID of superseded ADR
   */
  supersedes?: string | null;

  /**
   * ID of the ADR that supersedes this one.
   * - `undefined`: field not provided in JSON
   * - `null`: explicitly set to no value
   * - `string`: ID of superseding ADR
   */
  superseded_by?: string | null;

  /**
   * Original raw text line from CLI output.
   * Only populated when parsing text output (fallback path).
   * Not present in JSON output.
   */
  raw?: string;
}

/**
 * Normalize a raw JSON object to a typed AdrListItem.
 *
 * This function safely converts unknown JSON data to a well-typed AdrListItem,
 * applying sensible defaults for missing fields and ignoring unknown properties.
 *
 * Design decisions:
 * - Missing arrays default to `[]` to prevent null reference errors
 * - Missing strings remain `undefined` (not empty string)
 * - `null` values for supersedes fields are preserved (semantic meaning)
 * - Unknown extra fields are silently ignored (forward compatibility)
 *
 * @param raw - Raw JSON object from CLI output
 * @returns Normalized AdrListItem with appropriate defaults
 *
 * @example
 * ```typescript
 * const raw = { id: "001", title: "My ADR" };
 * const item = normalizeAdrListItem(raw);
 * // item.tags === []
 * // item.linked_commits === []
 * // item.status === undefined
 * ```
 */
export function normalizeAdrListItem(raw: Record<string, unknown>): AdrListItem {
  return {
    // Required fields - coerce to string
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),

    // Optional string fields - preserve undefined if not provided
    status: raw.status != null ? String(raw.status) : undefined,
    date: raw.date != null ? String(raw.date) : undefined,

    // Array fields - default to empty array
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    linked_commits: Array.isArray(raw.linked_commits)
      ? raw.linked_commits.map(String)
      : [],

    // Nullable fields - preserve null vs undefined distinction
    // undefined = not provided, null = explicitly no value
    supersedes:
      raw.supersedes === null
        ? null
        : raw.supersedes != null
          ? String(raw.supersedes)
          : undefined,
    superseded_by:
      raw.superseded_by === null
        ? null
        : raw.superseded_by != null
          ? String(raw.superseded_by)
          : undefined,
  };
}
