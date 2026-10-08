import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BEARER_AUTH_NAME } from '../common/swagger/api-protected.decorator.js';
import { ReviewController } from './review/review.controller.js';
import { ReviewService } from './review/review.service.js';
import { ReviewReportController } from './review-report/review-report.controller.js';
import { ReviewReportService } from './review-report/review-report.service.js';
import { StatsController } from './stats/stats.controller.js';
import { StatsService } from './stats/stats.service.js';

describe('reviews, reports and stats Swagger', () => {
    it('publishes the requested endpoints and bearer authentication in the API document', async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [ReviewController, ReviewReportController, StatsController],
            providers: [
                { provide: ReviewService, useValue: {} },
                { provide: ReviewReportService, useValue: {} },
                { provide: StatsService, useValue: {} },
            ],
        }).compile();
        const app = moduleRef.createNestApplication();

        try {
            const config = new DocumentBuilder()
                .setTitle('ElPepeSetch API')
                .setVersion('1.0')
                .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, BEARER_AUTH_NAME)
                .build();
            const document = SwaggerModule.createDocument(app, config);
            expect(document.paths).toHaveProperty('/media/{mediaItemId}/reviews');
            expect(document.paths).toHaveProperty('/reviews/{id}');
            expect(document.paths).toHaveProperty('/reviews/{reviewId}/report');
            expect(document.paths).toHaveProperty('/reports');
            expect(document.paths).toHaveProperty('/reports/{id}/resolve');
            expect(document.paths).toHaveProperty('/stats/me');
            expect(document.paths).toHaveProperty('/stats/global');
            expect(document.paths['/stats/global']?.get?.security).toEqual([{ [BEARER_AUTH_NAME]: [] }]);
            expect(document.paths['/reports/{id}/resolve']?.patch?.requestBody).toBeDefined();
        } finally {
            await app.close();
        }
    });
});
