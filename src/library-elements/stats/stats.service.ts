import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';
import { LibraryEntry } from '../entities/library_entry.entity.js';
import { MediaItem } from '../entities/media-item.entity.js';
import { Review } from '../entities/review.entity.js';
import { LibraryStatus, MediaType } from '../enums/library.enums.js';

@Injectable()
export class StatsService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(MediaItem) private readonly mediaRepository: Repository<MediaItem>,
        @InjectRepository(LibraryEntry) private readonly libraryRepository: Repository<LibraryEntry>,
        @InjectRepository(Review) private readonly reviewRepository: Repository<Review>,
    ) {}

    async getPersonalStats(userId: number): Promise<PersonalStats> {
        const entries = await this.libraryRepository.find({
            where: { user: { id: userId } },
            relations: { mediaItem: { genres: true } },
        });

        const mediaTypes: MediaType[] = Object.values(MediaType);
        const libraryStatuses: LibraryStatus[] = Object.values(LibraryStatus);
        const entriesByType = Object.fromEntries(mediaTypes.map((type) => [type, 0])) as Record<MediaType, number>;
        const entriesByStatus = Object.fromEntries(libraryStatuses.map((status) => [status, 0])) as Record<
            LibraryStatus,
            number
        >;
        const genreCounts = new Map<string, { id: string; name: string; count: number }>();
        const ratings: number[] = [];

        for (const entry of entries) {
            entriesByType[entry.mediaItem.type] += 1;
            entriesByStatus[entry.status] += 1;
            if (entry.rating !== null) ratings.push(entry.rating);

            for (const genre of entry.mediaItem.genres ?? []) {
                const existing = genreCounts.get(genre.id);
                if (existing) existing.count += 1;
                else genreCounts.set(genre.id, { id: genre.id, name: genre.name, count: 1 });
            }
        }

        const now = new Date();
        const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
        const afterLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
        const completedByMonth = Array.from({ length: 12 }, (_, index) => {
            const date = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + index, 1));
            const key = monthKey(date);
            return { month: key, count: 0 };
        });
        const monthCounts = new Map(completedByMonth.map((month) => [month.month, month]));

        for (const entry of entries) {
            if (
                entry.status !== LibraryStatus.COMPLETED ||
                !entry.completedAt ||
                entry.completedAt < firstMonth ||
                entry.completedAt >= afterLastMonth
            ) {
                continue;
            }
            const month = monthCounts.get(monthKey(entry.completedAt));
            if (month) month.count += 1;
        }

        const averageRating = ratings.length
            ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1))
            : 0;

        return {
            entriesByType,
            entriesByStatus,
            topGenres: [...genreCounts.values()]
                .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
                .slice(0, 5),
            completedByMonth,
            averageRating,
        };
    }

    async getGlobalStats(): Promise<GlobalStats> {
        const mediaTypes: MediaType[] = Object.values(MediaType);
        const [users, libraryEntries, reviews, ...mediaCounts] = await Promise.all([
            this.userRepository.count(),
            this.libraryRepository.count(),
            this.reviewRepository.count(),
            ...mediaTypes.map((type) => this.mediaRepository.count({ where: { type } })),
        ]);

        return {
            users,
            mediaItemsByType: Object.fromEntries(mediaTypes.map((type, index) => [type, mediaCounts[index]])) as Record<
                MediaType,
                number
            >,
            libraryEntries,
            reviews,
        };
    }
}

function monthKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export interface PersonalStats {
    entriesByType: Record<MediaType, number>;
    entriesByStatus: Record<LibraryStatus, number>;
    topGenres: Array<{ id: string; name: string; count: number }>;
    completedByMonth: Array<{ month: string; count: number }>;
    averageRating: number;
}

export interface GlobalStats {
    users: number;
    mediaItemsByType: Record<MediaType, number>;
    libraryEntries: number;
    reviews: number;
}
