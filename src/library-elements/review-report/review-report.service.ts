import { Injectable } from '@nestjs/common';
import { CreateReviewReportDto } from './dto/create-review-report.dto.js';
import { UpdateReviewReportDto } from './dto/update-review-report.dto.js';

@Injectable()
export class ReviewReportService {
  create(createReviewReportDto: CreateReviewReportDto) {
    return 'This action adds a new reviewReport';
  }

  findAll() {
    return `This action returns all reviewReport`;
  }

  findOne(id: number) {
    return `This action returns a #${id} reviewReport`;
  }

  update(id: number, updateReviewReportDto: UpdateReviewReportDto) {
    return `This action updates a #${id} reviewReport`;
  }

  remove(id: number) {
    return `This action removes a #${id} reviewReport`;
  }
}
