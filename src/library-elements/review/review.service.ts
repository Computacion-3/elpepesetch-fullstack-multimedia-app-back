import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { isUniqueViolation } from '../../common/database/pg-errors.js';
import { LibraryEntry } from '../entities/library_entry.entity.js';
import { MediaItem } from '../entities/media-item.entity.js';
import { Review } from '../entities/review.entity.js';
import { ActivityLogsService } from '../activity_logs/activity_logs.service.js';
import { ActivityAction, LibraryStatus } from '../enums/library.enums.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';

const ELIGIBLE_LIBRARY_STATUSES = [LibraryStatus.IN_PROGRESS, LibraryStatus.COMPLETED, LibraryStatus.DROPPED];

@Injectable()
export class ReviewService {
    constructor(
        @InjectRepository(Review) private readonly repository: Repository<Review>,
        @InjectRepository(MediaItem) private readonly mediaRepository: Repository<MediaItem>,
        @InjectRepository(LibraryEntry) private readonly libraryRepository: Repository<LibraryEntry>,
        private readonly activityLogsService: ActivityLogsService,
    ) {}

    async create(userId: number, mediaItemId: string, dto: CreateReviewDto): Promise<Review> {
        const mediaItem = await this.mediaRepository.findOne({ where: { id: mediaItemId } });
        if (!mediaItem) throw new NotFoundException(`Media item ${mediaItemId} not found`);

        const libraryEntry = await this.libraryRepository.findOne({
            where: {
                user: { id: userId },
                mediaItem: { id: mediaItemId },
                status: In(ELIGIBLE_LIBRARY_STATUSES),
            },
        });
        if (!libraryEntry) {
            throw new BadRequestException(
                'Debes tener el elemento en tu biblioteca y haberlo comenzado para reseñarlo',
            );
        }

        const existing = await this.repository.findOne({
            where: { user: { id: userId }, mediaItem: { id: mediaItemId } },
        });
        if (existing) throw new ConflictException('Ya existe una reseña tuya para este elemento');

        let review: Review;
        try {
            review = await this.repository.save(
                this.repository.create({
                    user: { id: userId },
                    mediaItem: { id: mediaItemId },
                    title: dto.title ?? null,
                    content: dto.content,
                    isHidden: false,
                    hiddenReason: null,
                }),
            );
        } catch (error) {
            if (isUniqueViolation(error)) throw new ConflictException('Ya existe una reseña tuya para este elemento');
            throw error;
        }

        await this.activityLogsService.logActivity(userId, {
            action: ActivityAction.REVIEW_CREATED,
            mediaItemId,
            metadata: { reviewId: review.id },
        });
        return review;
    }

    async findByMediaItem(
        mediaItemId: string,
        userId: number,
        canModerate: boolean,
        page = 1,
        limit = 10,
    ): Promise<ReviewListResponse> {
        const mediaItem = await this.mediaRepository.findOne({ where: { id: mediaItemId } });
        if (!mediaItem) throw new NotFoundException(`Media item ${mediaItemId} not found`);

        const where = canModerate
            ? { mediaItem: { id: mediaItemId } }
            : [
                  { mediaItem: { id: mediaItemId }, isHidden: false },
                  { mediaItem: { id: mediaItemId }, isHidden: true, user: { id: userId } },
              ];
        const [data, total] = await this.repository.findAndCount({
            where,
            relations: { user: true, mediaItem: true },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async update(id: string, userId: number, role: string, dto: UpdateReviewDto): Promise<Review> {
        const review = await this.findOne(id);
        this.assertOwnerOrAdmin(review, userId, role);
        return this.repository.save(this.repository.merge(review, dto));
    }

    async remove(id: string, userId: number, role: string): Promise<void> {
        const review = await this.findOne(id);
        this.assertOwnerOrAdmin(review, userId, role);
        await this.repository.remove(review);
    }

    private async findOne(id: string): Promise<Review> {
        const review = await this.repository.findOne({ where: { id }, relations: { user: true, mediaItem: true } });
        if (!review) throw new NotFoundException(`Review ${id} not found`);
        return review;
    }

    private assertOwnerOrAdmin(review: Review, userId: number, role: string): void {
        if (review.user.id !== userId && role !== 'ADMIN') {
            throw new ForbiddenException('Solo puedes modificar o eliminar tus propias reseñas');
        }
    }
}

export interface ReviewListResponse {
    data: Review[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}
