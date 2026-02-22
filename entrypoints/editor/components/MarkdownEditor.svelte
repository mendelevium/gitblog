<script lang="ts">
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import { uploadImage } from '../../../lib/github';
  import type { RepoInfo } from '../../../lib/types';

  let { value = $bindable(''), repo }: { value: string; repo: RepoInfo } = $props();

  let previewHtml = $state('');
  let debounceTimer: ReturnType<typeof setTimeout>;
  let paneMode = $state<'split' | 'editor' | 'preview'>('split');
  let textarea = $state<HTMLTextAreaElement | null>(null);
  let uploading = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);

  $effect(() => {
    const v = value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const raw = await marked.parse(v);
      previewHtml = DOMPurify.sanitize(raw);
    }, 300);
    return () => clearTimeout(debounceTimer);
  });

  async function handleImageUpload() {
    fileInput?.click();
  }

  async function onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    uploading = true;
    try {
      const url = await uploadImage(repo.owner, repo.name, file);
      insertAtCursor(`![${file.name}](${url})`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      uploading = false;
      input.value = '';
    }
  }

  function insertAtCursor(text: string) {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    value = value.substring(0, start) + text + value.substring(end);
    // Restore cursor position after the inserted text
    requestAnimationFrame(() => {
      if (textarea) {
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
      }
    });
  }
</script>

<div class="flex flex-col h-full">
  <!-- Toolbar -->
  <div class="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface shrink-0">
    <div class="flex gap-1">
      <button
        onclick={() => paneMode = 'editor'}
        class="px-2 py-1 text-xs rounded {paneMode === 'editor' ? 'bg-primary-light text-primary' : 'text-text-muted hover:text-text'}"
      >Editor</button>
      <button
        onclick={() => paneMode = 'split'}
        class="px-2 py-1 text-xs rounded {paneMode === 'split' ? 'bg-primary-light text-primary' : 'text-text-muted hover:text-text'}"
      >Split</button>
      <button
        onclick={() => paneMode = 'preview'}
        class="px-2 py-1 text-xs rounded {paneMode === 'preview' ? 'bg-primary-light text-primary' : 'text-text-muted hover:text-text'}"
      >Preview</button>
    </div>
    <div class="ml-auto">
      <button
        onclick={handleImageUpload}
        disabled={uploading}
        class="px-2 py-1 text-xs border border-border rounded text-text-muted hover:text-text disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Insert Image'}
      </button>
      <input bind:this={fileInput} type="file" accept="image/*" onchange={onFileSelected} class="hidden" />
    </div>
  </div>

  <!-- Editor / Preview Panes -->
  <div class="flex-1 grid {paneMode === 'split' ? 'grid-cols-2' : 'grid-cols-1'} min-h-0">
    {#if paneMode !== 'preview'}
      <textarea
        bind:this={textarea}
        bind:value
        class="w-full h-full p-4 font-mono text-sm resize-none border-r border-border focus:outline-none bg-surface text-text"
        placeholder="Write your markdown here..."
      ></textarea>
    {/if}
    {#if paneMode !== 'editor'}
      <div class="w-full h-full p-4 overflow-auto prose prose-sm dark:prose-invert max-w-none bg-surface text-text">
        {@html previewHtml}
      </div>
    {/if}
  </div>
</div>
