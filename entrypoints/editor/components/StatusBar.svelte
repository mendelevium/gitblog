<script lang="ts">
  import { getRateLimit } from '../../../lib/github';

  let { syncStatus, errorMessage = '' }: {
    syncStatus: 'idle' | 'saving' | 'error' | 'conflict';
    errorMessage: string;
  } = $props();

  let online = $state(navigator.onLine);
  let rateLimit = $state(getRateLimit());

  // Poll rate limit every 10s
  $effect(() => {
    const interval = setInterval(() => {
      rateLimit = getRateLimit();
    }, 10_000);
    return () => clearInterval(interval);
  });

  // Track online status
  $effect(() => {
    const onOnline = () => (online = true);
    const onOffline = () => (online = false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  });
</script>

<footer class="border-t border-border bg-surface px-4 py-2 flex items-center gap-4 text-xs shrink-0">
  <div class="flex items-center gap-1.5">
    {#if syncStatus === 'idle'}
      <span class="w-2 h-2 rounded-full bg-success"></span>
      <span class="text-success">Saved</span>
    {:else if syncStatus === 'saving'}
      <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
      <span class="text-primary">Saving...</span>
    {:else if syncStatus === 'error'}
      <span class="w-2 h-2 rounded-full bg-error"></span>
      <span class="text-error">{errorMessage || 'Error'}</span>
    {:else if syncStatus === 'conflict'}
      <span class="w-2 h-2 rounded-full bg-warning"></span>
      <span class="text-warning">Conflict detected</span>
    {/if}
  </div>

  <div class="ml-auto flex items-center gap-4">
    {#if rateLimit}
      <span class="text-text-muted">API: {rateLimit.remaining}/{rateLimit.limit}</span>
    {/if}
    <span class="flex items-center gap-1">
      <span class="w-2 h-2 rounded-full {online ? 'bg-success' : 'bg-text-muted'}"></span>
      {online ? 'Online' : 'Offline'}
    </span>
  </div>
</footer>
