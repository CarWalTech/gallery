import {
  Column,
  CreateDateColumn,
  ForeignKeyColumn,
  Generated,
  Index,
  PrimaryGeneratedColumn,
  Table,
  Timestamp,
  UpdateDateColumn,
} from '@immich/sql-tools';
import { CreateIdColumn, UpdatedAtTrigger, UpdateIdColumn } from 'src/decorators';
import { SharedSpaceTable } from 'src/schema/tables/shared-space.table';

@Table('shared_space_folder')
@UpdatedAtTrigger('shared_space_folder_updatedAt')
@Index({ columns: ['spaceId', 'parentId'] })
export class SharedSpaceFolderTable {
  @PrimaryGeneratedColumn()
  id!: Generated<string>;

  @ForeignKeyColumn(() => SharedSpaceTable, { onDelete: 'CASCADE', nullable: false })
  spaceId!: string;

  // Null = root level (no parent folder). CASCADE so deleting a folder also removes all children.
  @ForeignKeyColumn(() => SharedSpaceFolderTable, { onDelete: 'CASCADE', nullable: true })
  parentId!: string | null;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', default: 'amber', nullable: true })
  color!: Generated<string | null>;

  // Zero-based ordering among siblings.
  @Column({ type: 'integer', default: 0 })
  position!: Generated<number>;

  @CreateDateColumn()
  createdAt!: Generated<Timestamp>;

  @UpdateDateColumn()
  updatedAt!: Generated<Timestamp>;

  @CreateIdColumn({ index: true })
  createId!: Generated<string>;

  @UpdateIdColumn({ index: true })
  updateId!: Generated<string>;
}
