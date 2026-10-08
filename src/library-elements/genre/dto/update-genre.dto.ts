import { PartialType } from '@nestjs/swagger';
import { CreateGenreDto } from './create-genre.dto.js';

export class UpdateGenreDto extends PartialType(CreateGenreDto) {}
