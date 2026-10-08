import { PartialType } from '@nestjs/swagger';
import { CreateLibraryEntryDto } from './create-library-entry.dto.js';

export class UpdateLibraryEntryDto extends PartialType(CreateLibraryEntryDto) {}
