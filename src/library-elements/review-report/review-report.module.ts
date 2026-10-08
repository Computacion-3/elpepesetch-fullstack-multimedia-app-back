import { Module } from '@nestjs/common';
import { ReviewReportService } from './review-report.service.js';
import { ReviewReportController } from './review-report.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewReport } from '../entities/review-report.entity.js';

@Module({
    imports: [TypeOrmModule.forFeature([ReviewReport])],
    controllers: [ReviewReportController],
    providers: [ReviewReportService],
})
export class ReviewReportModule {}
