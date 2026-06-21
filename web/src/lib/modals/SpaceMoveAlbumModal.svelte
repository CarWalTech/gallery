<script lang="ts">
  import { handleError } from '$lib/utils/handle-error';
  import { updateSharedSpaceAlbum, type SharedSpaceFolderResponseDto, type SharedSpaceLinkedAlbumDto } from '@immich/sdk';
  import { Button, Icon, Modal, ModalBody, ModalFooter } from '@immich/ui';
  import { mdiCheck, mdiFolderOutline, mdiHomeOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';

  type Props = {
    spaceId: string;
    album: SharedSpaceLinkedAlbumDto;
    folders: SharedSpaceFolderResponseDto[];
    onClose: (moved?: boolean) => void;
  };

  const { spaceId, album, folders, onClose }: Props = $props();

  let submitting = $state(false);

  // Full class strings so Tailwind JIT includes them.
  const ICON_COLOR: Record<string, string> = {
    amber:  'text-amber-400',
    orange: 'text-orange-400',
    red:    'text-red-400',
    pink:   'text-pink-400',
    purple: 'text-purple-400',
    blue:   'text-blue-400',
    green:  'text-green-400',
    gray:   'text-gray-400',
  };

  function folderIconColor(folder: SharedSpaceFolderResponseDto): string {
    const c = folder.color ?? 'amber';
    return ICON_COLOR[c] ?? ICON_COLOR['amber'];
  }

  type FolderEntry = { folder: SharedSpaceFolderResponseDto; depth: number };

  function buildList(parentId: string | null = null, depth = 0): FolderEntry[] {
    return folders
      .filter((f) => (f.parentId ?? null) === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap((f) => [{ folder: f, depth }, ...buildList(f.id, depth + 1)]);
  }

  const orderedFolders = $derived(buildList());

  async function moveTo(targetFolderId: string | null) {
    if (targetFolderId === (album.folderId ?? null)) {
      onClose(false);
      return;
    }
    submitting = true;
    try {
      await updateSharedSpaceAlbum({
        id: spaceId,
        albumId: album.albumId,
        sharedSpaceAlbumLinkUpdateDto: { folderId: targetFolderId },
      });
      onClose(true);
    } catch (error) {
      handleError(error, $t('space_folder_error_move'));
    } finally {
      submitting = false;
    }
  }
</script>

<Modal title={$t('space_folder_move_album')} {onClose} size="small" icon={mdiFolderOutline}>
  <ModalBody>
    <ul class="flex flex-col gap-1 py-1">
      <li>
        <button
          class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          onclick={() => moveTo(null)}
          disabled={submitting}
        >
          <Icon icon={mdiHomeOutline} size="20" class="shrink-0 text-gray-500" />
          <span class="flex-1 truncate">{$t('space_folder_move_to_root')}</span>
          {#if (album.folderId ?? null) === null}
            <Icon icon={mdiCheck} size="16" class="text-primary" />
          {/if}
        </button>
      </li>

      {#each orderedFolders as { folder, depth } (folder.id)}
        <li>
          <button
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            style="padding-left: {0.75 + depth * 1.25}rem"
            onclick={() => moveTo(folder.id)}
            disabled={submitting}
          >
            <Icon icon={mdiFolderOutline} size="20" class="shrink-0 {folderIconColor(folder)}" />
            <span class="flex-1 truncate">{folder.name}</span>
            {#if (album.folderId ?? null) === folder.id}
              <Icon icon={mdiCheck} size="16" class="text-primary" />
            {/if}
          </button>
        </li>
      {/each}

      {#if folders.length === 0}
        <li class="px-3 py-4 text-center text-sm text-gray-500">
          {$t('space_folders_empty')}
        </li>
      {/if}
    </ul>
  </ModalBody>
  <ModalFooter>
    <Button shape="round" color="secondary" fullWidth onclick={() => onClose()} disabled={submitting}>
      {$t('cancel')}
    </Button>
  </ModalFooter>
</Modal>
