import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';
import { ActivityAction } from '../enums/library.enums.js';

@Entity('activity_logs')
export class ActivityLog {
    @PrimaryGeneratedColumn('uuid') id: string;
    @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' }) user: Relation<User>;
    @Column({ type: 'enum', enum: ActivityAction }) action: ActivityAction;
    @Column({ name: 'media_item_id', type: 'uuid', nullable: true }) mediaItemId: string | null;
    @Column({ name: 'library_entry_id', type: 'uuid', nullable: true }) libraryEntryId: string | null;
    @Column({ name: 'metadata', type: 'jsonb', nullable: true }) metadata: Record<string, unknown> | null;
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
