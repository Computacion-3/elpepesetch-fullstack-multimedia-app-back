import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewReport } from '../entities/review-report.entity.js';
import { CreateReviewReportDto } from './dto/create-review-report.dto.js';
import { UpdateReviewReportDto } from './dto/update-review-report.dto.js';

@Injectable()
export class ReviewReportService {
  constructor(@InjectRepository(ReviewReport) private readonly repository: Repository<ReviewReport>) {}
  create(createReviewReportDto: CreateReviewReportDto) {
    const { reviewId: _reviewId, ...data } = createReviewReportDto;
    return this.repository.save(this.repository.create(data));
  }

  findAll() {
    return this.repository.find({ relations: { review: true, reporter: true } });
  }

  async findOne(id: string) {
    const entity = await this.repository.findOne({ where: { id }, relations: { review: true, reporter: true } });
    if (!entity) throw new NotFoundException(`Review report ${id} not found`);
    return entity;
  }

  async update(id: string, updateReviewReportDto: UpdateReviewReportDto) {
    const entity = await this.findOne(id);
    return this.repository.save(this.repository.merge(entity, updateReviewReportDto));
  }

  async remove(id: string) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return { message: `Review report ${id} deleted successfully` };
  }
}
