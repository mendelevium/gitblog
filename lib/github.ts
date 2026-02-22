import { Octokit } from '@octokit/rest';
import { storage } from './storage';
import { getCached, setCache, invalidateCache } from './cache';
import type { GitHubUser, RepoInfo, BlogPost, SiteSection, JekyllConfig, CreateRepoProgress } from './types';
import { parseFrontMatter, serializeFrontMatter, generatePostFilename, parseConfig, serializeConfig } from './jekyll';

let octokit: Octokit | null = null;
let lastRateLimit: { remaining: number; limit: number; reset: number } | null = null;
const noDraftsDir = new Set<string>();

export function getRateLimit() {
  return lastRateLimit;
}

function trackRateLimit(response: any) {
  const headers = response?.headers;
  if (headers) {
    const remaining = Number(headers['x-ratelimit-remaining']);
    const limit = Number(headers['x-ratelimit-limit']);
    const reset = Number(headers['x-ratelimit-reset']);
    if (!isNaN(remaining)) {
      lastRateLimit = { remaining, limit, reset };
    }
  }
}

async function getOctokit(): Promise<Octokit> {
  const token = await storage.getToken();
  if (!token) throw new Error('Not authenticated');
  if (!octokit) {
    octokit = new Octokit({ auth: token });
  }
  return octokit;
}

export function resetOctokit() {
  octokit = null;
}

// --- Auth ---

export async function validateToken(token: string): Promise<GitHubUser> {
  const kit = new Octokit({ auth: token });
  const { data, headers } = await kit.rest.users.getAuthenticated();
  trackRateLimit({ headers });
  return { login: data.login, avatar_url: data.avatar_url, name: data.name ?? null };
}

// --- Repos ---

export async function listRepos(): Promise<RepoInfo[]> {
  const kit = await getOctokit();
  const { data, headers } = await kit.rest.repos.listForAuthenticatedUser({
    type: 'owner',
    sort: 'updated',
    per_page: 100,
  });
  trackRateLimit({ headers });
  return data
    .filter((r) => !r.fork)
    .map((r) => ({
      owner: r.owner.login,
      name: r.name,
      fullName: r.full_name,
      defaultBranch: r.default_branch,
    }));
}

export async function detectJekyll(owner: string, repo: string): Promise<boolean> {
  const kit = await getOctokit();
  try {
    const resp = await kit.rest.repos.getContent({ owner, repo, path: '_config.yml' });
    trackRateLimit(resp);
    return true;
  } catch (e: any) {
    if (e.status === 404) return false;
    throw e;
  }
}

// --- File helpers ---

function toBase64(text: string): string {
  return btoa(new TextEncoder().encode(text).reduce((s, b) => s + String.fromCharCode(b), ''));
}

function fromBase64(encoded: string): string {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export class ConflictError extends Error {
  constructor(public path: string) {
    super(`Conflict: ${path} was modified externally`);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RepoCreationError extends Error {
  status: number;
  phase: 'repo-creation' | 'scaffolding';
  constructor(message: string, status: number, phase: 'repo-creation' | 'scaffolding') {
    super(message);
    this.name = 'RepoCreationError';
    this.status = status;
    this.phase = phase;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// --- Posts ---

export async function listPosts(owner: string, repo: string): Promise<BlogPost[]> {
  const cacheKey = `${owner}/${repo}/posts`;
  const cached = await getCached<BlogPost[]>(cacheKey);
  if (cached) return cached;

  const kit = await getOctokit();
  const posts: BlogPost[] = [];

  const repoKey = `${owner}/${repo}`;
  for (const [dir, isDraft] of [['_posts', false], ['_drafts', true]] as const) {
    if (isDraft && noDraftsDir.has(repoKey)) continue;
    try {
      const resp = await kit.rest.repos.getContent({ owner, repo, path: dir });
      trackRateLimit(resp);
      if (!Array.isArray(resp.data)) continue;
      for (const file of resp.data) {
        if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown')) continue;
        posts.push({
          filename: file.name,
          path: file.path,
          sha: file.sha,
          title: file.name.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.(md|markdown)$/, '').replace(/-/g, ' '),
          date: file.name.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '',
          tags: [],
          category: '',
          content: '',
          isDraft,
        });
      }
    } catch (e: any) {
      if (e.status !== 404) throw e;
      if (isDraft) noDraftsDir.add(repoKey);
    }
  }

  posts.sort((a, b) => b.date.localeCompare(a.date));
  await setCache(cacheKey, posts);
  return posts;
}

export async function getPost(owner: string, repo: string, path: string): Promise<BlogPost> {
  const cacheKey = `${owner}/${repo}/post:${path}`;
  const cached = await getCached<BlogPost>(cacheKey);
  if (cached) return cached;

  const kit = await getOctokit();
  const resp = await kit.rest.repos.getContent({ owner, repo, path });
  trackRateLimit(resp);
  const data = resp.data as any;
  const raw = fromBase64(data.content);
  const { frontMatter, body } = parseFrontMatter(raw);
  const isDraft = path.startsWith('_drafts/');

  const post: BlogPost = {
    filename: data.name,
    path: data.path,
    sha: data.sha,
    title: (frontMatter.title as string) ?? data.name,
    date: (frontMatter.date as string) ?? '',
    tags: Array.isArray(frontMatter.tags) ? frontMatter.tags : [],
    category: (frontMatter.category as string) ?? '',
    content: body,
    isDraft,
  };

  await setCache(cacheKey, post);
  return post;
}

export async function createFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
): Promise<string> {
  const kit = await getOctokit();
  const resp = await kit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: toBase64(content),
  });
  trackRateLimit(resp);
  if (path.startsWith('_drafts/')) noDraftsDir.delete(`${owner}/${repo}`);
  await invalidateCache(`${owner}/${repo}/`);
  return (resp.data.content as any).sha;
}

export async function updateFile(
  owner: string,
  repo: string,
  path: string,
  sha: string,
  content: string,
  message: string,
): Promise<string> {
  const kit = await getOctokit();
  try {
    const resp = await kit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: toBase64(content),
      sha,
    });
    trackRateLimit(resp);
    await invalidateCache(`${owner}/${repo}/`);
    return (resp.data.content as any).sha;
  } catch (e: any) {
    if (e.status === 409) throw new ConflictError(path);
    throw e;
  }
}

export async function deleteFile(
  owner: string,
  repo: string,
  path: string,
  sha: string,
  message: string,
): Promise<void> {
  const kit = await getOctokit();
  try {
    const resp = await kit.rest.repos.deleteFile({ owner, repo, path, message, sha });
    trackRateLimit(resp);
    await invalidateCache(`${owner}/${repo}/`);
  } catch (e: any) {
    if (e.status === 409) throw new ConflictError(path);
    throw e;
  }
}

// --- Images ---

export async function uploadImage(
  owner: string,
  repo: string,
  file: File,
): Promise<string> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be under 5 MB');
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const base64 = btoa(bytes.reduce((s, b) => s + String.fromCharCode(b), ''));

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `assets/images/${timestamp}-${safeName}`;

  const kit = await getOctokit();
  const resp = await kit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: `Upload image: ${file.name}`,
    content: base64,
  });
  trackRateLimit(resp);
  return `/${path}`;
}

// --- Sections ---

export async function listSections(owner: string, repo: string): Promise<SiteSection[]> {
  const cacheKey = `${owner}/${repo}/sections`;
  const cached = await getCached<SiteSection[]>(cacheKey);
  if (cached) return cached;

  const kit = await getOctokit();

  // Get root files
  const resp = await kit.rest.repos.getContent({ owner, repo, path: '' });
  trackRateLimit(resp);
  if (!Array.isArray(resp.data)) return [];

  const pageFiles = resp.data.filter(
    (f) => (f.name.endsWith('.md') || f.name.endsWith('.html')) && f.name !== 'README.md' && f.name !== 'index.md' && f.name !== 'index.html',
  );

  // Get config for header_pages
  let headerPages: string[] = [];
  try {
    const config = await getConfig(owner, repo);
    headerPages = config.config.header_pages ?? [];
  } catch {
    // no config
  }

  const sections: SiteSection[] = pageFiles.map((f) => {
    const order = headerPages.indexOf(f.name);
    return {
      filename: f.name,
      path: f.path,
      sha: f.sha,
      title: f.name.replace(/\.(md|html)$/, '').replace(/-/g, ' '),
      permalink: `/${f.name.replace(/\.(md|html)$/, '')}/`,
      layout: 'page',
      content: '',
      order: order >= 0 ? order : 999,
      visible: order >= 0,
    };
  });

  sections.sort((a, b) => a.order - b.order);
  await setCache(cacheKey, sections);
  return sections;
}

export async function getSection(owner: string, repo: string, path: string): Promise<SiteSection> {
  const kit = await getOctokit();
  const resp = await kit.rest.repos.getContent({ owner, repo, path });
  trackRateLimit(resp);
  const data = resp.data as any;
  const raw = fromBase64(data.content);
  const { frontMatter, body } = parseFrontMatter(raw);

  return {
    filename: data.name,
    path: data.path,
    sha: data.sha,
    title: (frontMatter.title as string) ?? data.name,
    permalink: (frontMatter.permalink as string) ?? '',
    layout: (frontMatter.layout as string) ?? 'page',
    content: body,
    order: 0,
    visible: true,
  };
}

// --- Config ---

export async function getConfig(
  owner: string,
  repo: string,
): Promise<{ config: JekyllConfig; sha: string; raw: string }> {
  const kit = await getOctokit();
  const resp = await kit.rest.repos.getContent({ owner, repo, path: '_config.yml' });
  trackRateLimit(resp);
  const data = resp.data as any;
  const raw = fromBase64(data.content);
  const config = parseConfig(raw);
  return { config, sha: data.sha, raw };
}

export async function updateConfig(
  owner: string,
  repo: string,
  config: JekyllConfig,
  sha: string,
): Promise<string> {
  const content = serializeConfig(config);
  return updateFile(owner, repo, '_config.yml', sha, content, 'Update site configuration');
}

// --- Create Jekyll Repo ---

function getJekyllScaffoldFiles(username: string): { path: string; content: string; message: string }[] {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      path: '_config.yml',
      content: `title: ${username}'s Blog
description: A blog powered by Jekyll and GitHub Pages
permalink: /:title/
plugins:
  - jekyll-feed
header_pages:
  - about.md
`,
      message: 'Add Jekyll configuration',
    },
    {
      path: '_includes/head.html',
      content: `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{% if page.title %}{{ page.title }} &mdash; {% endif %}{{ site.title }}</title>
<meta name="description" content="{{ page.excerpt | default: site.description | strip_html | truncatewords: 50 }}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{{ '/assets/css/style.css' | relative_url }}">
{% feed_meta %}
`,
      message: 'Add head include',
    },
    {
      path: '_layouts/default.html',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  {% include head.html %}
</head>
<body>
  <header class="site-header">
    <div class="wrapper">
      <a class="site-title" href="{{ '/' | relative_url }}">{{ site.title }}</a>
      <nav class="site-nav">
        <a href="{{ '/' | relative_url }}">Blog</a>
        {% for path in site.header_pages %}
          {% assign page_obj = site.pages | where: "path", path | first %}
          {% if page_obj %}
            <a href="{{ page_obj.url | relative_url }}">{{ page_obj.title }}</a>
          {% endif %}
        {% endfor %}
      </nav>
    </div>
  </header>

  <main class="site-content">
    <div class="wrapper">
      {{ content }}
    </div>
  </main>

  <footer class="site-footer">
    <div class="wrapper">
      <span>&copy; {{ site.time | date: "%Y" }} {{ site.title }}</span>
      <a href="{{ '/feed.xml' | relative_url }}">RSS</a>
    </div>
  </footer>
</body>
</html>
`,
      message: 'Add default layout',
    },
    {
      path: '_layouts/home.html',
      content: `---
layout: default
---

<ul class="post-list">
  {% for post in site.posts %}
    <li>
      <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%b %-d, %Y" }}</time>
      <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
      {% if post.excerpt %}
        <p class="post-excerpt">{{ post.excerpt | strip_html | truncatewords: 30 }}</p>
      {% endif %}
    </li>
  {% endfor %}
</ul>
`,
      message: 'Add home layout',
    },
    {
      path: '_layouts/page.html',
      content: `---
layout: default
---

<article>
  <h1>{{ page.title }}</h1>
  {{ content }}
</article>
`,
      message: 'Add page layout',
    },
    {
      path: '_layouts/post.html',
      content: `---
layout: default
---

<article class="post">
  <time datetime="{{ page.date | date_to_xmlschema }}">{{ page.date | date: "%b %-d, %Y" }}</time>
  <h1>{{ page.title }}</h1>
  {{ content }}
</article>
`,
      message: 'Add post layout',
    },
    {
      path: 'assets/css/style.css',
      content: `:root {
  --text: #1a1a1a;
  --text-secondary: #6b6b6b;
  --bg: #ffffff;
  --bg-alt: #f7f7f7;
  --border: #e5e5e5;
  --content-width: 640px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --text: #e5e5e5;
    --text-secondary: #999999;
    --bg: #141414;
    --bg-alt: #1e1e1e;
    --border: #2e2e2e;
  }
}

*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 17px;
  line-height: 1.8;
  color: var(--text);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}

.wrapper {
  max-width: var(--content-width);
  margin: 0 auto;
  padding: 0 20px;
}

/* Header */
.site-header {
  padding: 40px 0 32px;
}

.site-header .wrapper {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.site-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  text-decoration: none;
}

.site-nav a {
  font-size: 15px;
  color: var(--text-secondary);
  text-decoration: none;
  margin-left: 24px;
}

.site-nav a:hover {
  color: var(--text);
}

/* Content */
.site-content {
  padding: 16px 0 80px;
}

/* Post list */
.post-list {
  list-style: none;
}

.post-list li {
  margin-bottom: 32px;
}

.post-list time {
  display: block;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.post-list a {
  font-size: 20px;
  font-weight: 500;
  color: var(--text);
  text-decoration: none;
}

.post-list a:hover {
  text-decoration: underline;
}

.post-excerpt {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-top: 4px;
}

/* Post */
.post time {
  display: block;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.post h1 {
  margin-bottom: 32px;
}

/* Article typography */
article h1 {
  font-size: 32px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.02em;
}

article p {
  margin-bottom: 1.5em;
}

article a {
  color: var(--text);
  text-decoration: underline;
  text-underline-offset: 2px;
}

article img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

article blockquote {
  border-left: 3px solid var(--border);
  padding-left: 20px;
  color: var(--text-secondary);
  margin: 1.5em 0;
}

article pre {
  background: var(--bg-alt);
  padding: 16px 20px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 14px;
  line-height: 1.6;
  margin: 1.5em 0;
}

article code {
  font-size: 0.9em;
  background: var(--bg-alt);
  padding: 2px 6px;
  border-radius: 3px;
}

article pre code {
  background: none;
  padding: 0;
  border-radius: 0;
}

article ul, article ol {
  padding-left: 1.5em;
  margin-bottom: 1.5em;
}

article hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 2em 0;
}

/* Footer */
.site-footer {
  padding: 24px 0 40px;
}

.site-footer .wrapper {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
}

.site-footer a {
  color: var(--text-secondary);
  text-decoration: none;
}

.site-footer a:hover {
  color: var(--text);
}

/* Responsive */
@media (max-width: 480px) {
  body {
    font-size: 16px;
  }

  .site-header .wrapper {
    flex-direction: column;
    gap: 8px;
  }

  .site-nav a:first-child {
    margin-left: 0;
  }

  article h1 {
    font-size: 26px;
  }
}
`,
      message: 'Add stylesheet',
    },
    {
      path: 'index.md',
      content: `---
layout: home
---
`,
      message: 'Add home page',
    },
    {
      path: 'about.md',
      content: `---
layout: page
title: About
permalink: /about/
---

This is your About page. Edit it to tell visitors about yourself and your blog.
`,
      message: 'Add about page',
    },
    {
      path: `_posts/${today}-hello-world.md`,
      content: `---
layout: post
title: "Hello World!"
date: ${today}
---

Welcome to your new blog! This is your first post. Edit or delete it, then start writing.

You can manage this blog using the GitBlog extension.
`,
      message: 'Add first post',
    },
    {
      path: '.gitignore',
      content: `_site/
.sass-cache/
.jekyll-cache/
.jekyll-metadata
vendor/
`,
      message: 'Add .gitignore',
    },
  ];
}

export async function createJekyllRepo(
  username: string,
  onProgress?: (progress: CreateRepoProgress) => void,
): Promise<RepoInfo> {
  const kit = await getOctokit();
  const repoName = `${username}.github.io`;

  onProgress?.({ status: 'creating', filesCreated: 0, totalFiles: 0 });

  let repoData: any;
  try {
    const { data, headers } = await kit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      auto_init: true,
      description: 'My blog powered by Jekyll and GitHub Pages',
    });
    trackRateLimit({ headers });
    repoData = data;
  } catch (e: any) {
    throw new RepoCreationError(e.message, e.status, 'repo-creation');
  }

  // Wait for GitHub to initialize the default branch
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const owner = repoData.owner.login;
  const repo = repoData.name;
  const files = getJekyllScaffoldFiles(username);

  onProgress?.({ status: 'scaffolding', filesCreated: 0, totalFiles: files.length });

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.({
        status: 'scaffolding',
        currentFile: file.path,
        filesCreated: i,
        totalFiles: files.length,
      });

      const resp = await kit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: file.path,
        message: file.message,
        content: toBase64(file.content),
      });
      trackRateLimit(resp);
    }
  } catch (e: any) {
    throw new RepoCreationError(e.message, e.status, 'scaffolding');
  }

  onProgress?.({ status: 'done', filesCreated: files.length, totalFiles: files.length });

  return {
    owner,
    name: repo,
    fullName: repoData.full_name,
    defaultBranch: repoData.default_branch,
    isJekyll: true,
  };
}
