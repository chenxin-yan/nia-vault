// nia-sync configuration (read from ~/.nia-sync/config.json)
export interface NiaSyncConfig {
  api_key: string;
}

// nia-vault configuration (stored in ~/.config/nia-vault/config.json)
export interface VaultConfig {
  selectedFolders: string[];
}

// Local folder from Nia API (GET /data-sources?source_type=local_folder)
export interface LocalFolder {
  id: string;
  name: string;
  path: string;
}

// Search result item from Nia API
export interface SearchResultItem {
  title: string;
  content: string;
  path: string;
  score: number;
}

// Search response from Nia API (POST /search/query)
export interface SearchResult {
  results: SearchResultItem[];
  total: number;
}

// CLI flags for ask command
export interface AskFlags {
  folder?: string;
  limit?: number;
  sync?: boolean;
}
