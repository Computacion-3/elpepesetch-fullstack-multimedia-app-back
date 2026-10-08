import { PartialType } from '@nestjs/swagger';
import { CreateReviewReportDto } from './create-review-report.dto.js';

export class UpdateReviewReportDto extends PartialType(CreateReviewReportDto) {}
