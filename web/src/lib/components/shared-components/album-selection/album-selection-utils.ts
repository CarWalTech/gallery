import type { AlbumResponseDto } from '@immich/sdk';

export const SCROLL_PROPERTIES: ScrollIntoViewOptions = { block: 'center', behavior: 'smooth' };

// Avoid TS enum emit issues
export const AlbumModalRowType = {
  NEW_ALBUM: 'NEW_ALBUM',
  SECTION: 'SECTION',
  MESSAGE: 'MESSAGE',
  ALBUM_ITEM: 'ALBUM_ITEM',
} as const;

export type AlbumModalRowType = (typeof AlbumModalRowType)[keyof typeof AlbumModalRowType];

export interface AlbumModalRow {
  type: AlbumModalRowType;
  text?: string;
  album?: AlbumResponseDto;
  selected?: boolean;
  multiSelected?: boolean;

  // Tree support
  depth?: number;
  expanded?: boolean;
  hasChildren?: boolean;
}

export const isSelectableRowType = (type: AlbumModalRowType) =>
  type === AlbumModalRowType.ALBUM_ITEM || type === AlbumModalRowType.NEW_ALBUM;

export class AlbumModalRowConverter {
  private sortBy: string;
  private sortOrder: string;

  // Passed in from Svelte so state persists
  expandedState: Record<string, boolean>;

  constructor(sortBy: string, sortOrder: string, expandedState: Record<string, boolean>) {
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
    this.expandedState = expandedState;
  }

  toggle(id: string) {
    this.expandedState[id] = !this.expandedState[id];
  }

  private buildTree(albums: AlbumResponseDto[]) {
    const map = new Map<string, AlbumResponseDto & { children: any[] }>();

    for (const a of albums) {
      map.set(a.id, { ...a, children: [] });
    }

    const roots: (AlbumResponseDto & { children: any[] })[] = [];

    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  private flattenTree(nodes: (AlbumResponseDto & { children: any[] })[], depth = 0): AlbumModalRow[] {
    const rows: AlbumModalRow[] = [];

    for (const node of nodes) {
      const expanded = this.expandedState[node.id] ?? false;

      rows.push({
        type: AlbumModalRowType.ALBUM_ITEM,
        album: node,
        depth,
        expanded,
        hasChildren: node.children.length > 0,
      });

      if (expanded) {
        rows.push(...this.flattenTree(node.children, depth + 1));
      }
    }

    return rows;
  }

  toModalRows(
    search: string,
    recentAlbums: AlbumResponseDto[],
    allAlbums: AlbumResponseDto[],
    selectedRowIndex: number,
    multiSelectedIds: string[],
  ): AlbumModalRow[] {
    const rows: AlbumModalRow[] = [];

    // NEW ALBUM ROW
    if (search.trim().length > 0) {
      rows.push({
        type: AlbumModalRowType.NEW_ALBUM,
        text: search,
      });
    }

    // RECENT SECTION
    if (!search) {
      rows.push({
        type: AlbumModalRowType.SECTION,
        text: 'Recent',
      });

      if (recentAlbums.length === 0) {
        rows.push({
          type: AlbumModalRowType.MESSAGE,
          text: 'No recent albums',
        });
      } else {
        for (const album of recentAlbums) {
          rows.push({
            type: AlbumModalRowType.ALBUM_ITEM,
            album,
            depth: 0,
            expanded: false,
            hasChildren: false,
          });
        }
      }
    }

    // FULL ALBUM TREE SECTION
    rows.push({
      type: AlbumModalRowType.SECTION,
      text: 'Albums',
    });

    const tree = this.buildTree(allAlbums);
    let treeRows = this.flattenTree(tree);

    // SEARCH FILTERING
    if (search.trim().length > 0) {
      const q = search.toLowerCase();
      treeRows = treeRows.filter((r) => r.album && r.album.albumName.toLowerCase().includes(q));

      if (treeRows.length === 0) {
        rows.push({
          type: AlbumModalRowType.MESSAGE,
          text: 'No albums found',
        });
        return rows;
      }
    }

    // APPLY SELECTION + MULTISELECT
    const selectableRows = treeRows.filter((r) => isSelectableRowType(r.type));

    selectableRows.forEach((row, i) => {
      row.selected = i === selectedRowIndex;
      row.multiSelected = row.album ? multiSelectedIds.includes(row.album.id) : false;
    });

    rows.push(...treeRows);

    return rows;
  }
}
