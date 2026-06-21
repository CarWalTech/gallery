<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import SpaceAlbumCard from '$lib/components/spaces/space-album-card.svelte';
  import SpaceFolderCard from '$lib/components/spaces/space-folder-card.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import SpaceCreateFolderModal from '$lib/modals/SpaceCreateFolderModal.svelte';
  import SpaceLinkAlbumModal from '$lib/modals/SpaceLinkAlbumModal.svelte';
  import SpaceMoveAlbumModal from '$lib/modals/SpaceMoveAlbumModal.svelte';
  import { handleError } from '$lib/utils/handle-error';
  import {
    deleteSpaceFolder,
    getSharedSpaceAlbums,
    getSpaceFolders,
    SharedSpaceRole,
    unlinkAlbum,
    updateSharedSpaceAlbum,
    type SharedSpaceFolderResponseDto,
    type SharedSpaceLinkedAlbumDto,
    type SharedSpaceMemberResponseDto,
    type SharedSpaceResponseDto,
  } from '@immich/sdk';
  import { Button, Icon, modalManager } from '@immich/ui';
  import { mdiChevronRight, mdiFolderPlus, mdiHomeOutline, mdiImageMultipleOutline, mdiLinkVariantPlus } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const space = $derived<SharedSpaceResponseDto>(data.space);
  const members = $derived<SharedSpaceMemberResponseDto[]>(data.members);
  let albums = $state<SharedSpaceLinkedAlbumDto[]>(data.linkedAlbums);
  let folders = $state<SharedSpaceFolderResponseDto[]>(data.folders ?? []);

  // Current folder is driven by the URL query param so the browser back button works.
  // When navigating from an album back to this page, the URL includes ?folder=xxx and the
  // correct folder is restored automatically.
  const currentFolderId = $derived<string | null>(page.url.searchParams.get('folder'));

  const currentMember = $derived(members.find((m) => m.userId === authManager.user.id));
  const isEditor = $derived(
    currentMember?.role === SharedSpaceRole.Owner || currentMember?.role === SharedSpaceRole.Editor,
  );

  const linkedAlbumIds = $derived(albums.map((a) => a.albumId));

  const childFolders = $derived(folders.filter((f) => (f.parentId ?? null) === currentFolderId));
  const visibleAlbums = $derived(albums.filter((a) => (a.folderId ?? null) === currentFolderId));

  function buildBreadcrumbPath(folderId: string | null): SharedSpaceFolderResponseDto[] {
    const path: SharedSpaceFolderResponseDto[] = [];
    let id = folderId;
    while (id !== null) {
      const f = folders.find((folder) => folder.id === id);
      if (!f) break;
      path.unshift(f);
      id = f.parentId ?? null;
    }
    return path;
  }

  const breadcrumbPath = $derived(buildBreadcrumbPath(currentFolderId));

  function albumCountForFolder(folderId: string): number {
    return albums.filter((a) => (a.folderId ?? null) === folderId).length;
  }

  function openFolder(folder: SharedSpaceFolderResponseDto) {
    void goto(`?folder=${folder.id}`, { noScroll: true });
  }

  function navigateToFolder(folderId: string | null) {
    void goto(folderId ? `?folder=${folderId}` : page.url.pathname, { noScroll: true });
  }

  async function reload() {
    try {
      albums = await getSharedSpaceAlbums({ id: space.id });
    } catch (error) {
      handleError(error, $t('spaces_linked_albums_error_load'));
    }
  }

  async function reloadFolders() {
    try {
      folders = await getSpaceFolders({ id: space.id });
    } catch (error) {
      handleError(error, $t('space_folder_error_create'));
    }
  }

  async function handleUnlink(album: SharedSpaceLinkedAlbumDto) {
    const confirmed = await modalManager.showDialog({
      prompt: $t('spaces_linked_albums_unlink_confirmation', { values: { name: album.albumName } }),
      title: $t('spaces_linked_albums_unlink'),
    });
    if (!confirmed) {
      return;
    }
    try {
      await unlinkAlbum({ id: space.id, albumId: album.albumId });
      await reload();
      await invalidateAll();
    } catch (error) {
      handleError(error, $t('spaces_linked_albums_error_unlink'));
    }
  }

  async function handleToggleTimeline(album: SharedSpaceLinkedAlbumDto) {
    try {
      await updateSharedSpaceAlbum({
        id: space.id,
        albumId: album.albumId,
        sharedSpaceAlbumLinkUpdateDto: { showInTimeline: !album.showInTimeline },
      });
      albums = albums.map((a) => (a.albumId === album.albumId ? { ...a, showInTimeline: !album.showInTimeline } : a));
      await invalidateAll();
    } catch (error) {
      handleError(error, $t('spaces_linked_albums_error_update'));
    }
  }

  async function handleMoveAlbum(album: SharedSpaceLinkedAlbumDto) {
    const moved = await modalManager.show(SpaceMoveAlbumModal, {
      spaceId: space.id,
      album,
      folders,
    });
    if (moved) {
      await reload();
    }
  }

  async function openLinkAlbumModal() {
    const linkedCount = await modalManager.show(SpaceLinkAlbumModal, {
      spaceId: space.id,
      linkedAlbumIds,
    });
    if (linkedCount) {
      await reload();
      await invalidateAll();
    }
  }

  async function handleCreateFolder() {
    const created = await modalManager.show(SpaceCreateFolderModal, {
      spaceId: space.id,
      parentId: currentFolderId,
    });
    if (created) {
      await reloadFolders();
    }
  }

  async function handleRenameFolder(folder: SharedSpaceFolderResponseDto) {
    const updated = await modalManager.show(SpaceCreateFolderModal, {
      spaceId: space.id,
      folder,
    });
    if (updated) {
      await reloadFolders();
    }
  }

  async function handleDeleteFolder(folder: SharedSpaceFolderResponseDto) {
    const confirmed = await modalManager.showDialog({
      title: $t('space_folder_delete'),
      prompt: $t('space_folder_delete_confirm', { values: { name: folder.name } }),
    });
    if (!confirmed) {
      return;
    }
    try {
      await deleteSpaceFolder({ id: space.id, folderId: folder.id });
      // If we're inside the deleted folder, navigate to its parent (or root).
      if (currentFolderId === folder.id) {
        navigateToFolder(folder.parentId ?? null);
      }
      await Promise.all([reloadFolders(), reload()]);
    } catch (error) {
      handleError(error, $t('space_folder_error_delete'));
    }
  }
</script>

<div class="flex h-full flex-col">
  <!-- Header -->
  <div class="flex items-center justify-between px-4 py-2">
    <!-- Breadcrumb / count -->
    <div class="flex min-w-0 items-center gap-1 text-sm text-gray-500 overflow-hidden">
      {#if breadcrumbPath.length === 0}
        <span>{$t('space_albums_count', { values: { count: albums.length } })}</span>
      {:else}
        <button
          class="flex items-center gap-1 hover:text-primary transition-colors shrink-0"
          onclick={() => navigateToFolder(null)}
        >
          <Icon icon={mdiHomeOutline} size="16" />
        </button>
        {#each breadcrumbPath as crumb, i (crumb.id)}
          <Icon icon={mdiChevronRight} size="16" class="shrink-0" />
          {#if i < breadcrumbPath.length - 1}
            <button
              class="hover:text-primary transition-colors truncate"
              onclick={() => navigateToFolder(crumb.id)}
            >
              {crumb.name}
            </button>
          {:else}
            <span class="font-medium text-gray-900 dark:text-white truncate">{crumb.name}</span>
          {/if}
        {/each}
      {/if}
    </div>

    <!-- Action buttons -->
    <div class="flex shrink-0 items-center gap-1">
      {#if isEditor}
        <Button
          size="small"
          variant="ghost"
          leadingIcon={mdiFolderPlus}
          onclick={() => void handleCreateFolder()}
          data-testid="new-folder-button"
        >
          {$t('space_folder_create')}
        </Button>
        <Button
          size="small"
          variant="ghost"
          leadingIcon={mdiLinkVariantPlus}
          onclick={() => void openLinkAlbumModal()}
          data-testid="link-album-button"
        >
          {$t('spaces_linked_albums_link_album')}
        </Button>
      {/if}
    </div>
  </div>

  <!-- Content -->
  {#if childFolders.length === 0 && visibleAlbums.length === 0}
    {#if currentFolderId !== null}
      <!-- Empty folder -->
      <div class="flex min-h-[calc(66vh-11rem)] w-full place-content-center items-center dark:text-white">
        <div class="flex flex-col content-center items-center gap-4 text-center">
          <Icon icon={mdiImageMultipleOutline} size="3.5em" />
          <p class="text-lg text-gray-500 dark:text-gray-400">
            {$t('space_folders_empty')}
          </p>
        </div>
      </div>
    {:else if albums.length === 0}
      <!-- No albums at all -->
      <div class="flex min-h-[calc(66vh-11rem)] w-full place-content-center items-center dark:text-white">
        <div class="flex flex-col content-center items-center gap-4 text-center">
          <Icon icon={mdiImageMultipleOutline} size="3.5em" />
          <p class="text-lg text-gray-500 dark:text-gray-400" data-testid="empty-state-message">
            {$t('space_albums_empty')}
          </p>
          {#if isEditor}
            <Button onclick={() => void openLinkAlbumModal()} data-testid="empty-link-album-button">
              {$t('space_albums_empty_editor_cta')}
            </Button>
          {/if}
        </div>
      </div>
    {:else}
      <!-- Albums exist but all are filed under other folders -->
      <div class="flex min-h-[calc(66vh-11rem)] w-full place-content-center items-center dark:text-white">
        <div class="flex flex-col content-center items-center gap-4 text-center">
          <Icon icon={mdiImageMultipleOutline} size="3.5em" />
          <p class="text-lg text-gray-500 dark:text-gray-400">
            {$t('space_folder_unfiled')}
          </p>
        </div>
      </div>
    {/if}
  {:else}
    <div class="px-4 pt-4">
      <!-- Folder grid -->
      {#if childFolders.length > 0}
        <div
          class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8"
          data-testid="folder-grid"
        >
          {#each childFolders as folder (folder.id)}
            <SpaceFolderCard
              spaceId={space.id}
              {folder}
              albumCount={albumCountForFolder(folder.id)}
              canManage={isEditor}
              isActive={currentFolderId === folder.id}
              onclick={openFolder}
              onRename={handleRenameFolder}
              onDelete={handleDeleteFolder}
            />
          {/each}
        </div>
      {/if}

      <!-- Album grid -->
      {#if visibleAlbums.length > 0}
        <div
          class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8"
          data-testid="album-grid"
        >
          {#each visibleAlbums as album (album.albumId)}
            <SpaceAlbumCard
              spaceId={space.id}
              {album}
              canManage={isEditor}
              onUnlink={handleUnlink}
              onToggleTimeline={handleToggleTimeline}
              onMoveToFolder={handleMoveAlbum}
            />
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
