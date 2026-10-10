import { Module } from '@nestjs/common';
import { ReviewReportService } from './review-report.service.js';
import { ReviewReportController } from './review-report.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewReport } from '../entities/review-report.entity.js';
import { Review } from '../entities/review.entity.js';

@Module({
    imports: [TypeOrmModule.forFeature([ReviewReport, Review])],
    controllers: [ReviewReportController],
    providers: [ReviewReportService],
})
export class ReviewReportModule {}
