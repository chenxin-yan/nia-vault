import { z } from "zod";

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
    if (response.status === 429) {
      throw new NiaApiError(
        "Rate limit exceeded. Please try again later.",
        429,
      );
    }
    throw new NiaApiError(
      `API request failed with status ${response.status}`,
      response.status,
    );
  }

  return response;
}

// ============================================================================
// Zod Schemas (for raw API response validation)
// ============================================================================

/**
 * Schema for raw API source response
 * Based on Nia API docs: POST /search/query with include_sources=true
 * Note: The API embeds file path in the first line of content, not as a separate field
 */
const RawSource = z.object({
  content: z.string().optional(),
});

/**
 * Schema for raw API response
 */
const RawSearchResponse = z.object({
  content: z.string().optional(),
  sources: z.array(RawSource).optional(),
});

// ============================================================================
// Exported Types (plain TypeScript for output)
// ============================================================================

export interface SearchResultItem {
  content: string;
  filePath?: string;
}

export interface SearchResult {
  /** AI-generated response content */
  answer?: string;
  /** Source snippets used to generate the response */
  sources: SearchResultItem[];
  /** Total number of sources found */
  total: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Parse file path from source content.
 * API returns content with the file path on the first line.
 * Example: "+ Incubator/02 Synthesis/Plato-Euthyphro.md\n\n## Content..."
 *
 * @returns Object with parsed filePath and remaining content
 */
function parseSourceContent(rawContent: string): {
  filePath?: string;
  content: string;
} {
  const lines = rawContent.split("\n");
  const firstLine = lines[0]?.trim();

  if (firstLine) {
    // First line is the file path, rest is content
    const remainingContent = lines.slice(1).join("\n").trim();
    return {
      filePath: firstLine,
      content: remainingContent,
    };
  }

  return { content: rawContent };
}

/**
 * Transform raw API source to SearchResultItem
 */
function transformSource(source: z.infer<typeof RawSource>): SearchResultItem {
  const rawContent = source.content ?? "";
  const parsed = parseSourceContent(rawContent);
  return {
    content: parsed.content,
    filePath: parsed.filePath,
  };
}

/**
 * Search across local folders using the Nia API
 *
 * Uses POST /search/query with local_folders parameter.
 * Local folders must be synced via the nia-sync CLI first.
 *
 * The API returns:
 * - `content`: AI-generated answer based on sources (when search_mode="sources")
 * - `sources`: Array of relevant source snippets with file paths
 *
 * @param apiKey - Nia API key
 * @param query - Natural language search query
 * @param folderIds - Array of local folder IDs to search (from listLocalFolders)
 * @returns Search results with AI answer and source snippets
 *
 * @see https://docs.trynia.ai/api-reference/search-&-research/query-indexed-sources
 */
export async function searchLocalFolders(
  apiKey: string,
  query: string,
  folderIds: string[],
) {
  try {
    const response = await niaFetch(apiKey, "/search/query", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: query }],
        local_folders: folderIds,
        search_mode: "sources",
        include_sources: true,
        stream: false,
      }),
    });

    const rawData = await response.json();

    // Parse and validate API response
    const parseResult = RawSearchResponse.safeParse(rawData);

    if (!parseResult.success) {
      throw new NiaApiError(
        `Invalid API response format: ${parseResult.error.message}`,
      );
    }

    const data = parseResult.data;

    // Transform raw sources to SearchResultItem[]
    const rawSources = data.sources ?? [];
    const sources = rawSources.map(transformSource);

    // Build and validate final result
    const result = {
      answer: data.content,
      sources,
      total: sources.length,
    };

    return result;
  } catch (error) {
    if (error instanceof NiaApiError) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw new NiaApiError(
        `API response validation failed: ${error.issues.map((issue) => issue.message).join(", ")}`,
      );
    }
    throw new NiaApiError(
      "Could not connect to Nia API. Check your internet connection.",
    );
  }
}
