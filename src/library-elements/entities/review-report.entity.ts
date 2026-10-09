import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';
import { ReportReason, ReportStatus } from '../enums/library.enums.js';
import { Review } from './review.entity.js';

@Entity('review_reports')
@Unique(['review', 'reporter'])
export class ReviewReport {
    @PrimaryGeneratedColumn('uuid') id: string;
    @ManyToOne(() => Review, (review) => review.reports, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'review_id' })
    review: Relation<Review>;
    @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reporter_id' })
    reporter: Relation<User>;
    @Column({ type: 'enum', enum: ReportReason }) reason: ReportReason;
    @Column({ name: 'details', type: 'varchar', length: 255, nullable: true }) comment: string | null;
    @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.OPEN }) status: ReportStatus;
    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'resolved_by_id' })
    resolvedBy: Relation<User> | null;
    @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true }) resolvedAt: Date | null;
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
