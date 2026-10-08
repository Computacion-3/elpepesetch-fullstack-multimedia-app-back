import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../../common/database/pg-errors.js';
import { ReviewReport } from '../entities/review-report.entity.js';
import { Review } from '../entities/review.entity.js';
import { ReportResolutionAction, ReportStatus } from '../enums/library.enums.js';
import { CreateReviewReportDto } from './dto/create-review-report.dto.js';
import { ResolveReviewReportDto } from './dto/resolve-review-report.dto.js';
import { ReviewReportQueryDto } from './dto/review-report-query.dto.js';

@Injectable()
export class ReviewReportService {
    constructor(
        @InjectRepository(ReviewReport) private readonly repository: Repository<ReviewReport>,
        @InjectRepository(Review) private readonly reviewRepository: Repository<Review>,
    ) {}

    async create(reporterId: number, reviewId: string, dto: CreateReviewReportDto): Promise<ReviewReport> {
        const review = await this.reviewRepository.findOne({ where: { id: reviewId }, relations: { user: true } });
        if (!review) throw new NotFoundException(`Review ${reviewId} not found`);
        if (review.user.id === reporterId) throw new BadRequestException('No puedes reportar tu propia reseña');

        const existing = await this.repository.findOne({
            where: { review: { id: reviewId }, reporter: { id: reporterId } },
        });
        if (existing) throw new ConflictException('Ya reportaste esta reseña');

        try {
            return await this.repository.save(
                this.repository.create({
                    review: { id: reviewId },
                    reporter: { id: reporterId },
                    reason: dto.reason,
                    comment: dto.comment?.trim() || null,
                    status: ReportStatus.OPEN,
                    resolvedBy: null,
                    resolvedAt: null,
                }),
            );
        } catch (error) {
            if (isUniqueViolation(error)) throw new ConflictException('Ya reportaste esta reseña');
            throw error;
        }
    }

    async findAll(query: ReviewReportQueryDto): Promise<ReviewReportListResponse> {
        const [data, total] = await this.repository.findAndCount({
            where: query.status ? { status: query.status } : {},
            relations: {
                review: { user: true, mediaItem: true },
                reporter: true,
                resolvedBy: true,
            },
            order: { createdAt: 'DESC' },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        });
        return {
            data,
            meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) },
        };
    }

    async resolve(id: string, moderatorId: number, dto: ResolveReviewReportDto): Promise<ReviewReport> {
        if (dto.action === ReportResolutionAction.HIDE && !dto.reason?.trim()) {
            throw new BadRequestException('El motivo es obligatorio para ocultar una reseña');
        }

        return this.repository.manager.transaction(async (manager) => {
            const reports = manager.getRepository(ReviewReport);
            const reviews = manager.getRepository(Review);
            const report = await reports.findOne({ where: { id }, relations: { review: true } });
            if (!report) throw new NotFoundException(`Review report ${id} not found`);
            if (report.status !== ReportStatus.OPEN) throw new ConflictException('El reporte ya fue resuelto');

            if (dto.action === ReportResolutionAction.HIDE) {
                report.review.isHidden = true;
                report.review.hiddenReason = dto.reason!.trim();
                await reviews.save(report.review);
                report.status = ReportStatus.RESOLVED;
            } else {
                report.review.isHidden = false;
                report.review.hiddenReason = null;
                await reviews.save(report.review);
                report.status = ReportStatus.DISMISSED;
            }

            report.resolvedBy = { id: moderatorId } as ReviewReport['resolvedBy'];
            report.resolvedAt = new Date();
            return reports.save(report);
        });
    }
}

export interface ReviewReportListResponse {
    data: ReviewReport[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}
