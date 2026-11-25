import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../auth/entities/user.entity.js';

export enum NotificationType {
    MEDIA_MODERATED = 'MEDIA_MODERATED',
    REVIEW_VISIBILITY_CHANGED = 'REVIEW_VISIBILITY_CHANGED',
    ROLE_CHANGED = 'ROLE_CHANGED',
}

@Entity('notifications')
@Unique(['eventId'])
export class Notification {
    @PrimaryGeneratedColumn('uuid') id: string;
    @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: Relation<User>;
    @Column({ type: 'enum', enum: NotificationType }) type: NotificationType;
    @Column({ type: 'jsonb' }) payload: Record<string, unknown>;
    @Column({ name: 'event_id', type: 'uuid' }) eventId: string;
    @Column({ name: 'is_read', default: false }) isRead: boolean;
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
