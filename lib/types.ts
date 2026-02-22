export interface BlogPost {
  filename: string;
  path: string;
  sha: string;
  title: string;
  date: string;
  tags: string[];
  category: string;
  content: string;
  isDraft: boolean;
}

export interface SiteSection {
  filename: string;
  path: string;
  sha: string;
  title: string;
  permalink: string;
  layout: string;
  content: string;
  order: number;
  visible: boolean;
}

export interface JekyllConfig {
  title: string;
  description: string;
  theme?: string;
  plugins: string[];
  header_pages: string[];
  [key: string]: unknown;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

export interface RepoInfo {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isJekyll?: boolean;
}

export interface AppState {
  auth: {
    token: string | null;
    user: GitHubUser | null;
  };
  repo: RepoInfo | null;
  ui: {
    activeTab: 'posts' | 'sections';
    syncStatus: 'idle' | 'saving' | 'error' | 'conflict';
    errorMessage?: string;
  };
}

export interface CreateRepoProgress {
  status: 'creating' | 'scaffolding' | 'done' | 'error';
  currentFile?: string;
  filesCreated: number;
  totalFiles: number;
}

export type ColorMode = 'light' | 'dark' | 'system';

export type View =
  | { kind: 'post-list' }
  | { kind: 'post-editor'; path?: string }
  | { kind: 'section-list' }
  | { kind: 'section-editor'; path?: string }
  | { kind: 'settings' };
