import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../entities/review.entity.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';

@Injectable()
export class ReviewService {
  constructor(@InjectRepository(Review) private readonly repository: Repository<Review>) {}
  create(createReviewDto: CreateReviewDto) {
    const { mediaItemId: _mediaItemId, ...data } = createReviewDto;
    return this.repository.save(this.repository.create(data));
  }

  findAll() {
    return this.repository.find({ relations: { mediaItem: true, user: true } });
  }

  async findOne(id: string) {
    const entity = await this.repository.findOne({ where: { id }, relations: { mediaItem: true, user: true } });
    if (!entity) throw new NotFoundException(`Review ${id} not found`);
    return entity;
  }

  async update(id: string, updateReviewDto: UpdateReviewDto) {
    const entity = await this.findOne(id);
    const { mediaItemId: _mediaItemId, ...data } = updateReviewDto;
    return this.repository.save(this.repository.merge(entity, data));
  }

  async remove(id: string) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return { message: `Review ${id} deleted successfully` };
  }
}
