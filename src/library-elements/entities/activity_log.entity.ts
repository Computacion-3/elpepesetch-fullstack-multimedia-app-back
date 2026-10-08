import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';
import { MediaItem } from './media-item.entity.js';
import { ActivityAction } from '../enums/library.enums.js';

@Entity('activity_logs')
@Index(['user', 'createdAt'])
export class ActivityLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: Relation<User>;

    @Column({ type: 'enum', enum: ActivityAction })
    action: ActivityAction;

    @ManyToOne(() => MediaItem, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'media_item_id' })
    mediaItem: Relation<MediaItem> | null;

    @Column({ type: 'jsonb', nullable: true, default: null })
    metadata: Record<string, unknown> | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;
}
