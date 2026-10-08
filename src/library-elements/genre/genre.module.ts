import { Module } from '@nestjs/common';
import { GenreService } from './genre.service.js';
import { GenreController } from './genre.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Genre } from '../entities/genre.entity.js';

@Module({
    imports: [TypeOrmModule.forFeature([Genre])],
    controllers: [GenreController],
    providers: [GenreService],
})
export class GenreModule {}
