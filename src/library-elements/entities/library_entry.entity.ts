import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';

import { LibraryStatus } from '../enums/library.enums.js';
import type { Relation } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';
import { MediaItem } from './media-item.entity.js';

@Entity('library_entries')
@Unique(['user', 'mediaItem'])
@Check(`"progress" >= 0`)
@Check(`"rating" IS NULL OR ("rating" >= 1 AND "rating" <= 10)`)
export class LibraryEntry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: Relation<User>;

    @ManyToOne(() => MediaItem, (mediaItem) => mediaItem.libraryEntries, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'media_item_id' })
    mediaItem: Relation<MediaItem>;

    @Column({ type: 'enum', enum: LibraryStatus, default: LibraryStatus.PENDING })
    status: LibraryStatus;

    @Column({ type: 'integer', default: 0 })
    progress: number;

    @Column({ type: 'smallint', nullable: true, default: null })
    rating: number | null;

    @Column({ name: 'is_favorite', type: 'boolean', default: false })
    isFavorite: boolean;

    @Column({ type: 'text', nullable: true, default: null })
    notes: string | null;

    @Column({ name: 'started_at', type: 'timestamp', nullable: true, default: null })
    startedAt: Date | null;

    @Column({ name: 'completed_at', type: 'timestamp', nullable: true, default: null })
    completedAt: Date | null;

    @CreateDateColumn({ name: 'added_at', type: 'timestamp' })
    addedAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;
}
