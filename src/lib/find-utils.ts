import { join } from "node:path";

// ============================================================================
// Types
// ============================================================================

/**
 * Raw source from Nia search response after Zod parsing
 */
export interface NiaSearchSource {
  content: string;
  metadata: {
    file_path: string;
    local_folder_name?: string;
    local_folder_id?: string;
    chunk_index?: number;
    start_byte?: string;
    source_type?: string;
    score: number;
  };
}

/**
 * File entry after mapping sources to resolved paths
 */
export interface FileEntry {
  /** Absolute path for opening in editor */
  absolutePath: string;
  /** Relative path for display */
  displayPath: string;
  /** Name of the folder containing this file */
  folderName?: string;
  /** Text snippet from the matching chunk */
  snippet?: string;
}

// ============================================================================
// Pure Functions for Testing
// ============================================================================

/**
 * Filter sources by relevancy score threshold.
 * Sources with score below threshold are considered noise and excluded.
 *
 * @param sources - Array of Nia search sources with score in metadata
 * @param threshold - Minimum score to include (inclusive: score >= threshold)
 * @returns Filtered array containing only sources at or above threshold
 */
export function filterByScore(
  sources: NiaSearchSource[],
  threshold: number,
): NiaSearchSource[] {
  return sources.filter((source) => source.metadata.score >= threshold);
}

/**
 * Map Nia search sources to file entries with resolved absolute paths.
 *
 * Sources are resolved by looking up the folder base path from folderPathMap
 * and joining it with the relative file_path from metadata. Sources with
 * unresolvable folder IDs (missing from map) are excluded.
 *
 * @param sources - Array of Nia search sources
 * @param folderPathMap - Map of folder ID to base path (e.g., "/home/user/notes")
 * @returns Array of file entries with resolved paths
 */
export function mapSourcesToFiles(
  sources: NiaSearchSource[],
  folderPathMap: Map<string, string>,
): FileEntry[] {
  const result: FileEntry[] = [];

  for (const source of sources) {
    const folderId = source.metadata.local_folder_id;
    const relativePath = source.metadata.file_path;
    const basePath = folderId ? folderPathMap.get(folderId) : undefined;

    // Can't resolve path without base path - skip this source
    if (!basePath) {
      continue;
    }

    const absolutePath = join(basePath, relativePath);

    result.push({
      absolutePath,
      displayPath: relativePath,
      folderName: source.metadata.local_folder_name,
      snippet: source.content,
    });
  }

  return result;
}

/**
 * Deduplicate file entries by display path and limit results.
 *
 * When the same file appears multiple times (different chunks), only the
 * first occurrence is kept. This preserves relevancy ordering since
 * sources come pre-sorted by score from the API.
 *
 * @param files - Array of file entries (may contain duplicates)
 * @param maxResults - Maximum number of results to return
 * @returns Deduplicated and limited array of file entries
 */
export function deduplicateFiles(
  files: FileEntry[],
  maxResults: number,
): FileEntry[] {
  // Use Map to dedupe by displayPath - first occurrence wins (highest relevance)
  const uniqueMap = new Map<string, FileEntry>();

  for (const file of files) {
    if (!uniqueMap.has(file.displayPath)) {
      uniqueMap.set(file.displayPath, file);
    }
  }

  return Array.from(uniqueMap.values()).slice(0, maxResults);
}
