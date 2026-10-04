import { PartialType } from '@nestjs/mapped-types';
import { CreateLibraryEntryDto } from './create-library_entry.dto.js';

export class UpdateLibraryEntryDto extends PartialType(CreateLibraryEntryDto) {}
