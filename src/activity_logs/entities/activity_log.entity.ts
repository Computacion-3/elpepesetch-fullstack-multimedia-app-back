import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum ActivityAction {
    ENTRY_ADDED = 'ENTRY_ADDED',
    STATUS_CHANGED = 'STATUS_CHANGED',
    PROGRESS_UPDATED = 'PROGRESS_UPDATED',
    ENTRY_COMPLETED = 'ENTRY_COMPLETED',
    FAVORITE_TOGGLED = 'FAVORITE_TOGGLED',
    REVIEW_CREATED = 'REVIEW_CREATED',
    LIST_CREATED = 'LIST_CREATED',
}

@Entity('activity_logs')
@Index(['userId', 'createdAt'])
export class ActivityLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // TODO: replace userId with @ManyToOne(() => User) user when users is implemented.
    @Column({ type: 'uuid', name: 'user_id' })
    userId: string;

    @Column({ type: 'enum', enum: ActivityAction })
    action: ActivityAction;

    // TODO: replace mediaItemId with @ManyToOne(() => MediaItem) mediaItem when media is implemented.
    @Column({ type: 'uuid', name: 'media_item_id', nullable: true, default: null })
    mediaItemId: string | null;

    @Column({ type: 'jsonb', nullable: true, default: null })
    metadata: Record<string, unknown> | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;
}
