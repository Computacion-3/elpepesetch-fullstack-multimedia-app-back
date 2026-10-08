import { Module } from '@nestjs/common';
import { GenreService } from './genre.service.js';
import { GenreController } from './genre.controller.js';

@Module({
  controllers: [GenreController],
  providers: [GenreService],
})
export class GenreModule {}
