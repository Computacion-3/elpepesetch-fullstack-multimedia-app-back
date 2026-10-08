import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum LibraryStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    DROPPED = 'DROPPED',
}

@Entity('library_entries')
@Index(['userId', 'mediaItemId'], { unique: true })
@Check(`"progress" >= 0`)
@Check(`"rating" IS NULL OR ("rating" >= 1 AND "rating" <= 10)`)
export class LibraryEntry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // TODO: replace userId with @ManyToOne(() => User) user when users is implemented.
    @Column({ type: 'uuid', name: 'user_id' })
    userId: string;

    // TODO: replace mediaItemId with @ManyToOne(() => MediaItem) mediaItem when media is implemented.
    @Column({ type: 'uuid', name: 'media_item_id' })
    mediaItemId: string;

    @Column({ type: 'enum', enum: LibraryStatus, default: LibraryStatus.PENDING })
    status: LibraryStatus;

    @Column({ type: 'integer', default: 0 })
    progress: number;

    @Column({ type: 'smallint', nullable: true, default: null })
    rating: number | null;

    @Column({ type: 'boolean', default: false })
    isFavorite: boolean;

    @Column({ type: 'text', nullable: true, default: null })
    notes: string | null;

    @Column({ type: 'timestamp', nullable: true, default: null })
    startedAt: Date | null;

    @Column({ type: 'timestamp', nullable: true, default: null })
    completedAt: Date | null;

    @CreateDateColumn({ type: 'timestamp' })
    addedAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;
}
