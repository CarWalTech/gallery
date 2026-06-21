<script lang="ts">
  import { handleError } from '$lib/utils/handle-error';
  import { createSpaceFolder, updateSpaceFolder, type SharedSpaceFolderResponseDto } from '@immich/sdk';
  import { FormModal, Input } from '@immich/ui';
  import { mdiFolderPlus } from '@mdi/js';
  import { t } from 'svelte-i18n';

  type Props = {
    spaceId: string;
    /** Pass an existing folder to rename/edit it. */
    folder?: SharedSpaceFolderResponseDto;
    /** Parent folder ID for creating nested folders. */
    parentId?: string | null;
    onClose: (result?: SharedSpaceFolderResponseDto) => void;
  };

  const { spaceId, folder, parentId, onClose }: Props = $props();

  const isEdit = $derived(!!folder);

  const COLORS = ['amber', 'orange', 'red', 'pink', 'purple', 'blue', 'green', 'gray'] as const;
  type FolderColor = (typeof COLORS)[number];

  // Full class strings so Tailwind JIT includes them.
  const COLOR_BG: Record<FolderColor, string> = {
    amber:  'bg-amber-400',
    orange: 'bg-orange-400',
    red:    'bg-red-400',
    pink:   'bg-pink-400',
    purple: 'bg-purple-400',
    blue:   'bg-blue-400',
    green:  'bg-green-400',
    gray:   'bg-gray-400',
  };

  let name = $state(folder?.name ?? '');
  let selectedColor = $state<FolderColor>((folder?.color as FolderColor | null | undefined) ?? 'amber');
  let submitting = $state(false);

  const onSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    submitting = true;
    try {
      if (isEdit && folder) {
        const updated = await updateSpaceFolder({
          id: spaceId,
          folderId: folder.id,
          sharedSpaceFolderUpdateDto: { name: trimmed, color: selectedColor },
        });
        onClose(updated);
      } else {
        const created = await createSpaceFolder({
          id: spaceId,
          sharedSpaceFolderCreateDto: { name: trimmed, color: selectedColor, parentId: parentId ?? null },
        });
        onClose(created);
      }
    } catch (error) {
      handleError(error, isEdit ? $t('space_folder_error_update') : $t('space_folder_error_create'));
    } finally {
      submitting = false;
    }
  };
</script>

<FormModal
  icon={mdiFolderPlus}
  title={isEdit ? $t('space_folder_rename') : $t('space_folder_create')}
  submitText={isEdit ? $t('save') : $t('create')}
  cancelText={$t('cancel')}
  disabled={!name.trim() || submitting}
  {onSubmit}
  {onClose}
>
  <div class="flex flex-col gap-4">
    <Input
      bind:value={name}
      autofocus
      placeholder={$t('space_folder_name_placeholder')}
    />

    <!-- Color picker -->
    <div>
      <p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{$t('space_folder_color_label')}</p>
      <div class="flex gap-2">
        {#each COLORS as color (color)}
          <button
            type="button"
            class="size-7 rounded-full transition-all {COLOR_BG[color]}
              {selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-500 dark:ring-offset-gray-900 scale-110' : 'hover:scale-105'}"
            title={$t(`folder_color_${color}`)}
            onclick={() => (selectedColor = color)}
          ></button>
        {/each}
      </div>
    </div>
  </div>
</FormModal>
