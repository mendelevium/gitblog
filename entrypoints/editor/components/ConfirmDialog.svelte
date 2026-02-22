<script lang="ts">
  let {
    open = $bindable(false),
    title = 'Confirm',
    message = 'Are you sure?',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel,
  }: {
    open: boolean;
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning';
    onConfirm: () => void;
    onCancel?: () => void;
  } = $props();

  function handleConfirm() {
    open = false;
    onConfirm();
  }

  function handleCancel() {
    open = false;
    onCancel?.();
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="absolute inset-0 bg-black/40" onclick={handleCancel}></div>

    <!-- Dialog -->
    <div class="relative bg-surface rounded-lg shadow-lg border border-border p-6 max-w-md w-full mx-4">
      <h2 class="text-lg font-semibold text-text mb-2">{title}</h2>
      <p class="text-sm text-text-muted mb-6">{message}</p>
      <div class="flex justify-end gap-3">
        <button
          onclick={handleCancel}
          class="px-4 py-2 text-sm rounded-md border border-border text-text-muted hover:text-text"
        >
          {cancelLabel}
        </button>
        <button
          onclick={handleConfirm}
          class="px-4 py-2 text-sm rounded-md text-white {variant === 'danger' ? 'bg-error hover:bg-error/90' : 'bg-warning hover:bg-warning/90'}"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}
