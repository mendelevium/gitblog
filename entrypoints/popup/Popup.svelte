<script lang="ts">
  import { storage } from '../../lib/storage';
  import { validateToken, listRepos, detectJekyll, resetOctokit, createJekyllRepo } from '../../lib/github';
  import { sendMessage } from '../../lib/messaging';
  import type { GitHubUser, RepoInfo, CreateRepoProgress } from '../../lib/types';

  let token = $state('');
  let user = $state<GitHubUser | null>(null);
  let repos = $state<RepoInfo[]>([]);
  let selectedRepo = $state<RepoInfo | null>(null);
  let isJekyll = $state<boolean | null>(null);
  let loading = $state(false);
  let error = $state('');
  let connected = $state(false);
  let creatingRepo = $state(false);
  let createProgress = $state<CreateRepoProgress | null>(null);
  let hasGitHubPagesRepo = $derived(
    user ? repos.some((r) => r.name === `${user.login}.github.io`) : false
  );

  async function init() {
    const savedToken = await storage.getToken();
    const savedRepo = await storage.getRepo();
    if (savedToken) {
      try {
        user = await validateToken(savedToken);
        token = savedToken;
        connected = true;
        repos = await listRepos();
        if (savedRepo) {
          selectedRepo = repos.find((r) => r.fullName === savedRepo.fullName) ?? null;
          if (selectedRepo) {
            isJekyll = await detectJekyll(selectedRepo.owner, selectedRepo.name);
          }
        }
        if (!selectedRepo && user) {
          const pagesRepo = repos.find((r) => r.name === `${user.login}.github.io`);
          if (pagesRepo) {
            selectedRepo = pagesRepo;
            await storage.setRepo(pagesRepo);
            isJekyll = await detectJekyll(pagesRepo.owner, pagesRepo.name);
          }
        }
      } catch {
        // Token invalid, stay on auth screen
      }
    }
  }

  init();

  async function connect() {
    error = '';
    loading = true;
    try {
      resetOctokit();
      user = await validateToken(token);
      await storage.setToken(token);
      connected = true;
      repos = await listRepos();
      if (user) {
        const pagesRepo = repos.find((r) => r.name === `${user.login}.github.io`);
        if (pagesRepo) await selectRepo(pagesRepo);
      }
    } catch (e: any) {
      error = e.message?.includes('401') ? 'Invalid token' : 'Connection failed';
    } finally {
      loading = false;
    }
  }

  async function selectRepo(repo: RepoInfo) {
    selectedRepo = repo;
    isJekyll = null;
    await storage.setRepo(repo);
    isJekyll = await detectJekyll(repo.owner, repo.name);
    sendMessage('REPO_CHANGED', { owner: repo.owner, name: repo.name });
  }

  async function openEditor() {
    sendMessage('OPEN_EDITOR', undefined);
  }

  async function disconnect() {
    await storage.removeToken();
    await storage.removeRepo();
    resetOctokit();
    token = '';
    user = null;
    repos = [];
    selectedRepo = null;
    isJekyll = null;
    connected = false;
    error = '';
  }

  async function handleCreateRepo() {
    if (!user) return;
    error = '';
    creatingRepo = true;
    createProgress = { status: 'creating', filesCreated: 0, totalFiles: 0 };

    try {
      const newRepo = await createJekyllRepo(user.login, (progress) => {
        createProgress = progress;
      });

      repos = await listRepos();
      selectedRepo = repos.find((r) => r.fullName === newRepo.fullName) ?? newRepo;
      await storage.setRepo(selectedRepo);
      isJekyll = true;
      sendMessage('REPO_CHANGED', { owner: newRepo.owner, name: newRepo.name });
    } catch (e: any) {
      if (e?.name === 'RepoCreationError') {
        if (e.status === 422) {
          error = `${user.login}.github.io already exists.`;
        } else if (e.status === 403 && e.phase === 'repo-creation') {
          error = 'Your token needs Administration: Read and write permission, scoped to All repositories.';
        } else if (e.status === 403 && e.phase === 'scaffolding') {
          error = 'Repository created, but file scaffolding failed. Your token needs Contents: Read and write permission.';
        } else {
          error = e.message ?? 'Failed to create repository';
        }
      } else {
        error = e.message ?? 'Failed to create repository';
      }
      createProgress = null;
    } finally {
      creatingRepo = false;
    }
  }
</script>

<div class="w-[400px] min-h-[300px] p-6 bg-surface">
  <!-- Header -->
  <div class="flex items-center justify-between mb-5">
    <h1 class="text-lg font-bold text-text tracking-tight">GitBlog</h1>
    {#if connected && user}
      <span class="text-sm text-text-muted">@{user.login}</span>
    {/if}
  </div>

  {#if !connected}
    <!-- Auth State -->
    <div class="space-y-4">
      <p class="text-sm text-text-muted leading-relaxed">
        Connect with your GitHub Personal Access Token to manage your Jekyll blog.
      </p>
      <div class="text-xs text-text-muted leading-relaxed space-y-1">
        <a href="https://github.com/settings/tokens?type=beta" target="_blank"
           rel="noopener noreferrer" class="text-primary hover:underline">
          Create a fine-grained PAT
        </a>
        <span> with these permissions:</span>
        <ul class="list-disc list-inside ml-1 space-y-0.5">
          <li><strong>Repository access:</strong> All repositories</li>
          <li><strong>Contents:</strong> Read and write</li>
          <li><strong>Administration:</strong> Read and write <span class="text-text-muted">(to create repos)</span></li>
        </ul>
      </div>
      <input
        type="password"
        bind:value={token}
        placeholder="ghp_xxxxxxxxxxxx"
        class="w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-surface-alt text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors duration-150"
      />
      {#if error}
        <p class="text-sm text-error">{error}</p>
      {/if}
      <button
        onclick={connect}
        disabled={!token || loading}
        class="w-full px-4 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg disabled:opacity-50 transition-colors duration-150"
      >
        {loading ? 'Connecting...' : 'Connect'}
      </button>
    </div>
  {:else if creatingRepo && createProgress}
    <!-- Creating Repo State -->
    <div class="space-y-4">
      <h2 class="text-base font-semibold text-text">
        Creating {user?.login}.github.io
      </h2>
      <div class="w-full h-2 bg-surface-alt rounded-full overflow-hidden">
        <div
          class="h-full bg-primary rounded-full transition-all duration-300"
          style="width: {createProgress.totalFiles > 0 ? (createProgress.filesCreated / createProgress.totalFiles) * 100 : 10}%"
        ></div>
      </div>
      <p class="text-sm text-text-muted">
        {#if createProgress.status === 'creating'}
          Creating repository...
        {:else if createProgress.status === 'scaffolding'}
          Adding {createProgress.currentFile ?? 'files'}...
        {:else if createProgress.status === 'done'}
          Done!
        {/if}
      </p>
    </div>
  {:else}
    <!-- Connected State -->
    <div class="space-y-4">
      <!-- Repo selector -->
      <div>
        <span class="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5">
          Repository
        </span>
        <select
          onchange={(e) => {
            const repo = repos.find((r) => r.fullName === (e.target as HTMLSelectElement).value);
            if (repo) selectRepo(repo);
          }}
          class="w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors duration-150"
        >
          <option value="">Select a repository...</option>
          {#each repos as repo}
            <option value={repo.fullName} selected={selectedRepo?.fullName === repo.fullName}>
              {repo.fullName}
            </option>
          {/each}
        </select>
      </div>

      <!-- Jekyll status -->
      {#if isJekyll !== null}
        <div class="flex items-center gap-2 px-3 py-2 rounded-lg {isJekyll ? 'bg-success-light' : 'bg-warning-light'}">
          <span class="w-2 h-2 rounded-full {isJekyll ? 'bg-success' : 'bg-warning'}"></span>
          <span class="text-sm {isJekyll ? 'text-success' : 'text-warning'}">
            {isJekyll ? 'Jekyll detected' : 'No Jekyll structure found'}
          </span>
        </div>
      {/if}

      <!-- Open editor button -->
      {#if selectedRepo && isJekyll}
        <button
          onclick={openEditor}
          class="w-full px-4 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors duration-150"
        >
          Open GitBlog
        </button>
      {/if}

      <!-- Create repo button -->
      {#if user && !hasGitHubPagesRepo}
        <button
          onclick={handleCreateRepo}
          class="w-full px-4 py-2.5 text-sm font-medium text-primary bg-primary-light hover:opacity-80 rounded-lg transition-colors duration-150"
        >
          Create {user.login}.github.io
        </button>
      {/if}

      {#if error}
        <p class="text-sm text-error">{error}</p>
      {/if}

      <!-- Divider + Disconnect -->
      <hr class="border-border" />
      <button
        onclick={disconnect}
        class="w-full px-4 py-2.5 text-sm text-text-muted hover:text-error rounded-lg transition-colors duration-150"
      >
        Disconnect
      </button>
    </div>
  {/if}
</div>
