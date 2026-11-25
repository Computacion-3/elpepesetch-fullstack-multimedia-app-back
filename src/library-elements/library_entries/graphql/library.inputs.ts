import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { CreateLibraryEntryDto } from '../dto/create-library_entry.dto.js';
import { LibraryQueryDto, LibrarySortBy, SortOrder } from '../dto/library-query.dto.js';
import { UpdateLibraryEntryDto } from '../dto/update-library_entry.dto.js';
import { LibraryStatus, MediaType } from '../../enums/library.enums.js';

registerEnumType(LibrarySortBy, { name: 'LibrarySortBy' });
registerEnumType(SortOrder, { name: 'SortOrder' });

@InputType('LibraryFilterInput')
export class LibraryFilterInput extends LibraryQueryDto {
    @Field(() => LibraryStatus, { nullable: true }) declare status?: LibraryStatus;
    @Field({ nullable: true }) declare isFavorite?: boolean;
    @Field({ nullable: true }) declare q?: string;
    @Field(() => MediaType, { nullable: true }) declare type?: MediaType;
    @Field({ nullable: true }) declare genreId?: string;
    @Field(() => Int, { nullable: true }) declare year?: number;
    @Field(() => LibrarySortBy, { nullable: true }) declare sortBy: LibrarySortBy;
    @Field(() => SortOrder, { nullable: true }) declare order: SortOrder;
    @Field(() => Int, { nullable: true }) declare page: number;
    @Field(() => Int, { nullable: true }) declare limit: number;
}

@InputType('AddLibraryEntryInput')
export class AddLibraryEntryInput extends CreateLibraryEntryDto {
    @Field() declare mediaItemId: string;
    @Field(() => LibraryStatus, { nullable: true }) declare status?: LibraryStatus;
    @Field(() => Int, { nullable: true }) declare progress?: number;
    @Field(() => Int, { nullable: true }) declare rating?: number | null;
    @Field({ nullable: true }) declare isFavorite?: boolean;
    @Field(() => String, { nullable: true }) declare notes?: string | null;
}

@InputType('UpdateLibraryEntryInput')
export class UpdateLibraryEntryInput extends UpdateLibraryEntryDto {
    @Field(() => LibraryStatus, { nullable: true }) declare status?: LibraryStatus;
    @Field(() => Int, { nullable: true }) declare progress?: number;
    @Field(() => Int, { nullable: true }) declare rating?: number | null;
    @Field({ nullable: true }) declare isFavorite?: boolean;
    @Field(() => String, { nullable: true }) declare notes?: string | null;
}
