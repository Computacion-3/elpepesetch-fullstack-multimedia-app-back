import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ActivityAction } from '../enums/library.enums.js';

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
