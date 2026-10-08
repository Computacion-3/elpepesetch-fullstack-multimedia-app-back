import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';
import { MediaItem } from './media-item.entity.js';
import { ReviewReport } from './review-report.entity.js';

@Entity('reviews')
@Unique(['user', 'mediaItem'])
export class Review {
    @PrimaryGeneratedColumn('uuid') id: string;
    @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' }) user: Relation<User>;
    @ManyToOne(() => MediaItem, (mediaItem) => mediaItem.reviews, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'media_item_id' }) mediaItem: Relation<MediaItem>;
    @Column({ length: 100, nullable: true }) title: string | null;
    @Column({ type: 'text' }) content: string;
    @Column({ name: 'is_hidden', default: false }) isHidden: boolean;
    @Column({ name: 'hidden_reason', length: 255, nullable: true }) hiddenReason: string | null;
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
    @OneToMany(() => ReviewReport, (report) => report.review) reports: Relation<ReviewReport[]>;
}
