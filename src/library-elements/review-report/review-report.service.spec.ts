import { BadRequestException, ConflictException } from '@nestjs/common';
import { ReviewReport } from '../entities/review-report.entity.js';
import { Review } from '../entities/review.entity.js';
import { ReportReason, ReportResolutionAction, ReportStatus } from '../enums/library.enums.js';
import { ReviewReportQueryDto } from './dto/review-report-query.dto.js';
import { ReviewReportService } from './review-report.service.js';

describe('ReviewReportService', () => {
    const reviewId = '11111111-1111-4111-8111-111111111111';
    const reportId = '22222222-2222-4222-8222-222222222222';

    function makeService(initialStatus = ReportStatus.OPEN) {
        const review = Object.assign(new Review(), {
            id: reviewId,
            user: { id: 10 },
            isHidden: false,
            hiddenReason: null,
        });
        const reports: ReviewReport[] = [];
        const report = Object.assign(new ReviewReport(), {
            id: reportId,
            review,
            reporter: { id: 7 },
            reason: ReportReason.OTHER,
            comment: null,
            status: initialStatus,
            resolvedBy: null,
            resolvedAt: null,
        });
        if (initialStatus !== ReportStatus.OPEN) reports.push(report);

        const reportRepository = {
            create: vi.fn((value: Partial<ReviewReport>) => Object.assign(new ReviewReport(), value)),
            findOne: vi.fn(async ({ where }: any) => {
                if (where.id)
                    return (
                        reports.find((item) => item.id === where.id) ??
                        (initialStatus === ReportStatus.OPEN ? report : null)
                    );
                return (
                    reports.find(
                        (item) => item.review?.id === where.review?.id && item.reporter?.id === where.reporter?.id,
                    ) ?? null
                );
            }),
            findAndCount: vi.fn(async () => [reports, reports.length] as const),
            save: vi.fn(async (item: ReviewReport) => {
                if (!reports.some((current) => current.id === item.id)) {
                    item.id = reportId;
                    reports.push(item);
                }
                return item;
            }),
            manager: {} as any,
        };
        const reviewRepository = {
            findOne: vi.fn(async () => review),
            save: vi.fn(async (item: Review) => item),
        };
        const manager = {
            getRepository: vi.fn((entity: unknown) => (entity === ReviewReport ? reportRepository : reviewRepository)),
        };
        reportRepository.manager = {
            transaction: vi.fn(async (callback: (transactionManager: any) => unknown) => callback(manager)),
        };
        const service = new ReviewReportService(reportRepository as never, reviewRepository as never);
        return { service, reportRepository, reviewRepository, report, review, reports };
    }

    it('rejects reports of the reporter own review and creates one open report for someone else', async () => {
        const { service, reportRepository, reports } = makeService();
        await expect(service.create(10, reviewId, { reason: ReportReason.OTHER })).rejects.toBeInstanceOf(
            BadRequestException,
        );

        const created = await service.create(7, reviewId, { reason: ReportReason.SPAM, comment: 'Contenido repetido' });
        expect(created.status).toBe(ReportStatus.OPEN);
        expect(created.comment).toBe('Contenido repetido');
        expect(reports).toHaveLength(1);
        await expect(service.create(7, reviewId, { reason: ReportReason.SPAM })).rejects.toBeInstanceOf(
            ConflictException,
        );
        expect(reportRepository.save).toHaveBeenCalledTimes(1);
    });

    it('requires a reason for HIDE and records the moderator and reason atomically', async () => {
        const { service, reportRepository, reviewRepository, report, review } = makeService();
        await expect(service.resolve(reportId, 5, { action: ReportResolutionAction.HIDE })).rejects.toBeInstanceOf(
            BadRequestException,
        );

        const resolved = await service.resolve(reportId, 5, {
            action: ReportResolutionAction.HIDE,
            reason: 'Contiene un spoiler',
        });
        expect(review).toMatchObject({ isHidden: true, hiddenReason: 'Contiene un spoiler' });
        expect(reviewRepository.save).toHaveBeenCalledWith(review);
        expect(resolved).toMatchObject({ status: ReportStatus.RESOLVED, resolvedBy: { id: 5 } });
        expect(resolved.resolvedAt).toBeInstanceOf(Date);
        expect(reportRepository.manager.transaction).toHaveBeenCalledTimes(1);
        expect(report.status).toBe(ReportStatus.RESOLVED);
    });

    it('dismisses a report and leaves its review visible', async () => {
        const { service, review } = makeService();
        review.isHidden = true;
        review.hiddenReason = 'Motivo anterior';
        const dismissed = await service.resolve(reportId, 5, { action: ReportResolutionAction.DISMISS });
        expect(dismissed.status).toBe(ReportStatus.DISMISSED);
        expect(review).toMatchObject({ isHidden: false, hiddenReason: null });
    });

    it('does not allow resolving a report more than once', async () => {
        const { service } = makeService(ReportStatus.RESOLVED);
        await expect(service.resolve(reportId, 5, { action: ReportResolutionAction.DISMISS })).rejects.toBeInstanceOf(
            ConflictException,
        );
    });

    it('filters and paginates reports for moderators', async () => {
        const { service, reportRepository } = makeService();
        const query = Object.assign(new ReviewReportQueryDto(), { status: ReportStatus.OPEN, page: 2, limit: 5 });

        const result = await service.findAll(query);

        expect(result.meta).toEqual({ total: 0, page: 2, limit: 5, totalPages: 0 });
        expect(reportRepository.findAndCount).toHaveBeenCalledWith(
            expect.objectContaining({ where: { status: ReportStatus.OPEN }, skip: 5, take: 5 }),
        );
    });
});
