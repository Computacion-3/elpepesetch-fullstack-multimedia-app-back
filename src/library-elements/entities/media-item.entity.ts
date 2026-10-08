import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';
import { ApprovalStatus, MediaType } from '../enums/library.enums.js';
import { Genre } from './genre.entity.js';
import { LibraryEntry } from './library-entry.entity.js';
import { Review } from './review.entity.js';
import { UserList } from './user-list.entity.js';

@Entity('media_items')
@Unique(['title', 'type', 'releaseYear'])
export class MediaItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    @Column({ length: 150 }) title: string;
    @Column({ type: 'enum', enum: MediaType }) type: MediaType;
    @Column({ type: 'text', nullable: true }) description: string | null;
    @Column({ name: 'release_year', type: 'int' }) releaseYear: number;
    @Column({ length: 120 }) creator: string;
    @Column({ name: 'cover_url', type: 'varchar', length: 500, nullable: true }) coverUrl: string | null;
    @Column({ type: 'varchar', length: 60, nullable: true }) platform: string | null;
    @Column({ name: 'duration_minutes', type: 'int', nullable: true }) durationMinutes: number | null;
    @Column({ type: 'int', nullable: true }) pages: number | null;
    @Column({ type: 'varchar', length: 20, nullable: true }) isbn: string | null;
    @Column({ name: 'approval_status', type: 'enum', enum: ApprovalStatus, default: ApprovalStatus.PENDING })
    approvalStatus: ApprovalStatus;
    @Column({ name: 'rejection_reason', type: 'varchar', length: 255, nullable: true }) rejectionReason: string | null;
    @Column({ name: 'average_rating', type: 'decimal', precision: 3, scale: 1, default: 0 }) averageRating: number;
    @Column({ name: 'ratings_count', type: 'int', default: 0 }) ratingsCount: number;

    @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'created_by_id' })
    createdBy: Relation<User>;
    @ManyToMany(() => Genre, (genre) => genre.mediaItems)
    @JoinTable({
        name: 'media_item_genres',
        joinColumn: { name: 'media_item_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'genre_id', referencedColumnName: 'id' },
    })
    genres: Relation<Genre[]>;
    @OneToMany(() => LibraryEntry, (entry) => entry.mediaItem)
    libraryEntries: Relation<LibraryEntry[]>;
    @OneToMany(() => Review, (review) => review.mediaItem)
    reviews: Relation<Review[]>;
    @ManyToMany(() => UserList, (list) => list.items)
    lists: Relation<UserList[]>;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
