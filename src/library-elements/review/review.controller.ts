import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReviewService } from './review.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';

@Controller('review')
export class ReviewController {
    constructor(private readonly reviewService: ReviewService) {}

    @Post()
    create(@CurrentUser() user: AuthenticatedUser, @Body() createReviewDto: CreateReviewDto) {
        return this.reviewService.create(user.id, createReviewDto);
    }

    @Get()
    findAll() {
        return this.reviewService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.reviewService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto) {
        return this.reviewService.update(id, updateReviewDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.reviewService.remove(id);
    }
}
