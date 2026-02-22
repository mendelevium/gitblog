# GitBlog

A Chrome extension that lets you manage your Jekyll + GitHub Pages blog without touching git or markdown files manually. Authenticate with a GitHub Personal Access Token, and get a full split-pane markdown editor — all without any backend.

## Features

- **Post management** — Create, edit, publish, and delete blog posts with a live markdown preview
- **Draft support** — Save posts as drafts (`_drafts/`) or publish them (`_posts/`)
- **Image upload** — Upload images to your repo and insert markdown references at the cursor
- **Section management** — Add, edit, reorder, and delete top-level site pages (About, Projects, etc.)
- **Navigation ordering** — Drag-and-drop to reorder sections; updates `_config.yml` `header_pages` automatically
- **Conflict detection** — Warns you if a file was modified externally, with options to overwrite or reload
- **Site settings** — Edit `_config.yml` fields (title, description, URL) directly from the extension
- **Color mode** — Switch between dark, light, and system-preferred appearance
- **Jekyll site scaffolding** — Create a new Jekyll repository from scratch with a starter template
- **Status indicators** — Sync status, API rate limit, and online/offline state in the footer

## Prerequisites

- Chrome (or any Chromium-based browser)
- A GitHub repository with a Jekyll site (must have `_config.yml`)
- A [GitHub Personal Access Token](https://github.com/settings/tokens?type=beta) with **Contents: Read and write** permission scoped to your blog repo

## Setup

```bash
# Install dependencies
npm install

# Build the extension
npm run build
```

## Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `output/chrome-mv3/` folder

## Usage

### Connect your account

1. Click the GitBlog extension icon in your toolbar
2. Paste your GitHub Personal Access Token and click **Connect**
3. Select your Jekyll blog repository from the dropdown
4. You'll see a "Jekyll detected" badge if `_config.yml` is found
5. Click **Open GitBlog** to launch the editor in a new tab

### Write a post

1. In the editor tab, click **New Post**
2. Fill in the title, date, tags, and category
3. Write markdown in the left pane — the right pane shows a live preview
4. Use the toolbar to toggle between Editor / Split / Preview layouts
5. Click **Publish** to commit to `_posts/`, or **Save Draft** for `_drafts/`

### Upload an image

1. While editing a post or section, click **Insert Image** in the toolbar
2. Select an image file (max 5 MB)
3. The image is uploaded to `assets/images/` in your repo and a markdown reference is inserted at your cursor

### Manage sections

1. Switch to the **Sections** tab
2. Click **Add Section** to create a new page (e.g. About, Projects)
3. Drag and drop to reorder — the order is saved to `_config.yml` `header_pages`
4. Click a section to edit its content, permalink, or layout

### Configure your site

1. Switch to the **Settings** tab
2. Edit your site title, description, URL, and other `_config.yml` fields
3. Use the appearance toggle to switch between dark, light, and system color modes

### Disconnect

Click **Disconnect** in the popup to clear your token and reset the extension.

## Development

```bash
# Start dev server with HMR
npm run dev

# Production build
npm run build

# Package as zip
npm run zip
```

During development, `npm run dev` launches the extension with hot module replacement. Load the `output/chrome-mv3-dev/` folder as an unpacked extension — changes to Svelte components and styles will hot-reload in place.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | [WXT](https://wxt.dev/) (Manifest V3) |
| UI | Svelte 5 (runes) |
| Styling | Tailwind CSS v4 |
| GitHub API | [@octokit/rest](https://github.com/octokit/rest.js) |
| Markdown | [marked](https://github.com/markedjs/marked) + [DOMPurify](https://github.com/cure53/DOMPurify) |
| YAML | [js-yaml](https://github.com/nodeca/js-yaml) |

## Project Structure

```
gitblog/
├── entrypoints/
│   ├── popup/           # Extension popup (auth + repo selection)
│   ├── editor/          # Full-tab editor (unlisted page)
│   │   ├── pages/       # PostList, PostEditor, SectionList, SectionEditor, Settings
│   │   └── components/  # MarkdownEditor, FrontMatterForm, FileList, StatusBar, ConfirmDialog
│   └── background.ts    # Service worker (opens editor tab)
├── lib/                 # Shared code
│   ├── github.ts        # Octokit wrapper + all API calls
│   ├── jekyll.ts        # Front matter parsing, filename generation, _config.yml
│   ├── storage.ts       # chrome.storage typed helpers
│   ├── cache.ts         # TTL cache (5 min, chrome.storage.local)
│   ├── messaging.ts     # Cross-context messaging
│   ├── color-mode.ts    # Dark/light/system color mode
│   ├── toolbar-icon.ts  # Extension icon color mode sync
│   └── types.ts         # TypeScript interfaces
├── public/icons/        # Toolbar icons (light + dark variants)
├── app.css              # Tailwind v4 + design tokens
├── wxt.config.ts        # WXT configuration
└── spec.md              # Original product spec
```
