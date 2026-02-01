import type { LocalFolder, SearchResult, SearchResultItem } from "../types.js";

// Nia API base URL
const BASE_URL = "https://apigcp.trynia.ai/v2";

/**
 * Error class for Nia API errors
 */
export class NiaApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "NiaApiError";
  }
}

/**
 * Make authenticated request to Nia API
 */
async function niaFetch(
  apiKey: string,
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new NiaApiError(
        "Invalid API key. Run 'nia login' to re-authenticate.",
        401,
      );
    }
    if (response.status === 403) {
      throw new NiaApiError(
        "Access denied. Check your API key permissions.",
        403,
      );
    }
    throw new NiaApiError(
      `API request failed with status ${response.status}`,
      response.status,
    );
  }

  return response;
}

/**
 * List all synced local folders from Nia
 * GET /data-sources?source_type=local_folder
 */
export async function listLocalFolders(apiKey: string): Promise<LocalFolder[]> {
  try {
    const response = await niaFetch(
      apiKey,
      "/data-sources?source_type=local_folder",
    );
    const data = (await response.json()) as Record<string, unknown> | unknown[];

    // Handle API response format - may be wrapped in a data field or be an array directly
    const folders = Array.isArray(data)
      ? data
      : ((data as Record<string, unknown>).data ??
        (data as Record<string, unknown>).results ??
        []);

    return (folders as Record<string, unknown>[]).map(
      (folder: Record<string, unknown>) => ({
        id: String(folder.id ?? ""),
        name: String(folder.name ?? folder.title ?? ""),
        path: String(folder.path ?? folder.local_path ?? ""),
      }),
    );
  } catch (error) {
    if (error instanceof NiaApiError) {
      throw error;
    }
    throw new NiaApiError(
      "Could not connect to Nia API. Check your internet connection.",
    );
  }
}

/**
 * Search across selected folders
 * POST /search/query
 */
export async function searchLocalFolders(
  apiKey: string,
  query: string,
  folderIds: string[],
  limit: number = 5,
): Promise<SearchResult> {
  try {
    const response = await niaFetch(apiKey, "/search/query", {
      method: "POST",
      body: JSON.stringify({
        query,
        local_folders: folderIds,
        limit,
      }),
    });

    const data = (await response.json()) as Record<string, unknown> | unknown[];

    // Handle API response format
    const results = Array.isArray(data)
      ? data
      : ((data as Record<string, unknown>).results ??
        (data as Record<string, unknown>).data ??
        []);

    const searchResults: SearchResultItem[] = (
      results as Record<string, unknown>[]
    ).map((item: Record<string, unknown>) => ({
      title: String(item.title ?? item.name ?? ""),
      content: String(item.content ?? item.snippet ?? item.text ?? ""),
      path: String(item.path ?? item.file_path ?? ""),
      score: Number(item.score ?? item.relevance ?? 0),
    }));

    return {
      results: searchResults,
      total:
        ((data as Record<string, unknown>).total as number) ??
        searchResults.length,
    };
  } catch (error) {
    if (error instanceof NiaApiError) {
      throw error;
    }
    throw new NiaApiError(
      "Could not connect to Nia API. Check your internet connection.",
    );
  }
}
