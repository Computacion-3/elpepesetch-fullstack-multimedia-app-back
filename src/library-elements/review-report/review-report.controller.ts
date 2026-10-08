import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReviewReportService } from './review-report.service.js';
import { CreateReviewReportDto } from './dto/create-review-report.dto.js';
import { UpdateReviewReportDto } from './dto/update-review-report.dto.js';

@Controller('review-report')
export class ReviewReportController {
  constructor(private readonly reviewReportService: ReviewReportService) {}

  @Post()
  create(@Body() createReviewReportDto: CreateReviewReportDto) {
    return this.reviewReportService.create(createReviewReportDto);
  }

  @Get()
  findAll() {
    return this.reviewReportService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reviewReportService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReviewReportDto: UpdateReviewReportDto) {
    return this.reviewReportService.update(+id, updateReviewReportDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reviewReportService.remove(+id);
  }
}
