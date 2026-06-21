<script lang="ts">
  import ButtonContextMenu from '$lib/components/shared-components/context-menu/ButtonContextMenu.svelte';
  import MenuOption from '$lib/components/shared-components/context-menu/MenuOption.svelte';
  import type { SharedSpaceFolderResponseDto } from '@immich/sdk';
  import { Icon } from '@immich/ui';
  import { mdiDotsVertical, mdiFolder } from '@mdi/js';
  import { t } from 'svelte-i18n';

  interface Props {
    spaceId: string;
    folder: SharedSpaceFolderResponseDto;
    albumCount: number;
    canManage: boolean;
    isActive?: boolean;
    onclick?: (folder: SharedSpaceFolderResponseDto) => void;
    onRename?: (folder: SharedSpaceFolderResponseDto) => void;
    onDelete?: (folder: SharedSpaceFolderResponseDto) => void;
  }

  let { spaceId, folder, albumCount, canManage, isActive = false, onclick, onRename, onDelete }: Props = $props();

  // Full class strings so Tailwind JIT keeps them all.
  const BG: Record<string, string> = {
    amber:  'bg-amber-50  dark:bg-amber-950/30',
    orange: 'bg-orange-50 dark:bg-orange-950/30',
    red:    'bg-red-50    dark:bg-red-950/30',
    pink:   'bg-pink-50   dark:bg-pink-950/30',
    purple: 'bg-purple-50 dark:bg-purple-950/30',
    blue:   'bg-blue-50   dark:bg-blue-950/30',
    green:  'bg-green-50  dark:bg-green-950/30',
    gray:   'bg-gray-100  dark:bg-gray-800/50',
  };
  const ICON: Record<string, string> = {
    amber:  'text-amber-400  dark:text-amber-500',
    orange: 'text-orange-400 dark:text-orange-500',
    red:    'text-red-400    dark:text-red-500',
    pink:   'text-pink-400   dark:text-pink-500',
    purple: 'text-purple-400 dark:text-purple-500',
    blue:   'text-blue-400   dark:text-blue-500',
    green:  'text-green-400  dark:text-green-500',
    gray:   'text-gray-400   dark:text-gray-500',
  };

  const colorKey = $derived((folder.color ?? 'amber') in BG ? (folder.color ?? 'amber') : 'amber');
  const bgClass = $derived(BG[colorKey]);
  const iconClass = $derived(ICON[colorKey]);
</script>

<div
  data-testid="space-folder-card"
  class="group relative rounded-2xl border p-5 cursor-pointer transition-colors
    {isActive
      ? 'border-primary bg-primary/5 dark:bg-primary/10'
      : 'border-transparent hover:border-gray-200 hover:bg-gray-100 dark:hover:border-gray-800 dark:hover:bg-gray-900'}"
  role="button"
  tabindex="0"
  onclick={() => onclick?.(folder)}
  onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onclick?.(folder)}
>
  {#if canManage}
    <!-- stop propagation so the menu click doesn't also trigger folder navigation -->
    <div
      class="absolute inset-e-6 top-6 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100"
      data-testid="space-folder-card-menu"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="none"
    >
      <ButtonContextMenu
        icon={mdiDotsVertical}
        title={$t('more')}
        color="secondary"
        variant="filled"
        size="medium"
        align="top-right"
        direction="left"
        buttonClass="icon-white-drop-shadow"
      >
        <MenuOption text={$t('space_folder_rename')} onClick={() => onRename?.(folder)} />
        <MenuOption text={$t('space_folder_delete')} onClick={() => onDelete?.(folder)} />
      </ButtonContextMenu>
    </div>
  {/if}

  <!-- Folder icon -->
  <div class="relative aspect-square w-full overflow-hidden rounded-xl {bgClass} flex items-center justify-center">
    <Icon icon={mdiFolder} size="48" class={iconClass} />
  </div>

  <!-- Text info -->
  <div class="mt-4">
    <p
      class="line-clamp-2 w-full text-lg/6 font-semibold text-black group-hover:text-primary dark:text-white"
      title={folder.name}
    >
      {folder.name}
    </p>
    <p class="text-sm dark:text-immich-dark-fg">
      {$t('space_albums_count', { values: { count: albumCount } })}
    </p>
  </div>
</div>
