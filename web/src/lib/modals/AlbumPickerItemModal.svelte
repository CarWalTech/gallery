<script lang="ts">
  import { getAssetMediaUrl } from '$lib/utils';
  import type { AlbumResponseDto } from '@immich/sdk';
  import { Icon } from '@immich/ui';
  import { mdiCheck, mdiChevronDown, mdiChevronRight } from '@mdi/js';

  export let album: AlbumResponseDto;
  export let selected: boolean = false;
  export let multiSelected: boolean = false;

  // NEW props for tree support
  export let depth: number = 0;
  export let hasChildren: boolean = false;
  export let expanded: boolean = false;
  export let onToggle: () => void = () => {};

  export let searchQuery: string = '';
  export let onAlbumClick: () => void = () => {};
  export let onMultiSelect: () => void = () => {};

  const indent = `${depth * 1.25}rem`;
</script>

<div
  class="flex items-center gap-3 px-5 py-2 cursor-pointer hover:bg-immich-gray-100 dark:hover:bg-immich-dark-gray rounded-md transition-colors"
  class:selected
  style="padding-left: {indent};"
  on:click={(e) => {
    // If clicking the expand/collapse icon, don't trigger album click
    if ((e.target as HTMLElement).closest('.toggle-area')) return;
    onAlbumClick();
  }}
>
  <!-- Expand / collapse toggle -->
  {#if hasChildren}
    <div class="toggle-area flex items-center" on:click|stopPropagation={onToggle}>
      <Icon
        icon={expanded ? mdiChevronDown : mdiChevronRight}
        size="18"
        class="text-gray-500 dark:text-gray-400 hover:text-immich-primary dark:hover:text-immich-dark-primary transition-colors"
      />
    </div>
  {:else}
    <!-- Spacer for alignment -->
    <div style="width: 18px;"></div>
  {/if}

  <!-- Album thumbnail -->
  <span class="h-16 w-16 shrink-0 rounded-xl bg-slate-300">
    {#if album.albumThumbnailAssetId}
      <img
        src={getAssetMediaUrl({ id: album.albumThumbnailAssetId })}
        alt={album.albumName}
        class={['h-full w-full rounded-xl object-cover transition-all duration-300 hover:shadow-lg']}
        data-testid="album-image"
        draggable="false"
      />
    {/if}
  </span>

  <!-- Album name -->
  <div class="flex flex-col flex-1 min-w-0">
    <span class="truncate font-medium" title={album.albumName}>
      {album.albumName}
    </span>

    <span class="text-xs text-gray-500 dark:text-gray-400">
      {album.assetCount} items
    </span>
  </div>

  <!-- Multi-select checkmark -->
  {#if multiSelected}
    <Icon icon={mdiCheck} size="18" class="text-immich-primary dark:text-immich-dark-primary" />
  {/if}
</div>

<style>
  .selected {
    background-color: var(--immich-primary-50);
  }
</style>
