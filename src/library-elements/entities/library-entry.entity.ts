import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';
import { LibraryStatus } from '../enums/library.enums.js';
import { MediaItem } from './media-item.entity.js';

@Entity('library_entries')
@Unique(['user', 'mediaItem'])
export class LibraryEntry {
    @PrimaryGeneratedColumn('uuid') id: string;
    @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' }) user: Relation<User>;
    @ManyToOne(() => MediaItem, (mediaItem) => mediaItem.libraryEntries, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'media_item_id' }) mediaItem: Relation<MediaItem>;
    @Column({ type: 'enum', enum: LibraryStatus, default: LibraryStatus.PENDING }) status: LibraryStatus;
    @Column({ type: 'int', default: 0 }) progress: number;
    @Column({ type: 'smallint', nullable: true }) rating: number | null;
    @Column({ name: 'is_favorite', default: false }) isFavorite: boolean;
    @Column({ type: 'text', nullable: true }) notes: string | null;
    @Column({ name: 'started_at', type: 'timestamptz', nullable: true }) startedAt: Date | null;
    @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt: Date | null;
    @CreateDateColumn({ name: 'added_at', type: 'timestamptz' }) addedAt: Date;
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
