import { Module } from '@nestjs/common';
import { ReviewService } from './review.service.js';
import { ReviewController } from './review.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from '../entities/review.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Review])],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
