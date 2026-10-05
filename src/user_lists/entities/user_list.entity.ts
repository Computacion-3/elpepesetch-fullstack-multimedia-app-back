import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum ListVisibility {
    PRIVATE = 'PRIVATE',
    PUBLIC = 'PUBLIC',
}

@Entity('user_lists')
@Index(['ownerId', 'name'], { unique: true })
export class UserList {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // TODO: replace ownerId with @ManyToOne(() => User) owner when users is implemented.
    @Column({ type: 'uuid', name: 'owner_id' })
    ownerId: string;

    @Column({ type: 'varchar', length: 80 })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    description: string | null;

    @Column({ type: 'enum', enum: ListVisibility, default: ListVisibility.PRIVATE })
    visibility: ListVisibility;

    // Temporary storage while MediaItem is not available.
    // TODO: replace itemIds with @ManyToMany(() => MediaItem) items and
    // @JoinTable({ name: 'list_items' }) when the media entity is implemented.
    @Column({ type: 'uuid', array: true, default: () => 'ARRAY[]::uuid[]' })
    itemIds: string[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;
}
