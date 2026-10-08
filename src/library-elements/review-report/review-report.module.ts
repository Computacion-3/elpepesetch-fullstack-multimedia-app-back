import { Module } from '@nestjs/common';
import { ReviewReportService } from './review-report.service.js';
import { ReviewReportController } from './review-report.controller.js';

@Module({
  controllers: [ReviewReportController],
  providers: [ReviewReportService],
})
export class ReviewReportModule {}
