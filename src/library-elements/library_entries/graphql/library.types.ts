import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { LibraryStatus, MediaType } from '../../enums/library.enums.js';

registerEnumType(LibraryStatus, { name: 'LibraryStatus' });
registerEnumType(MediaType, { name: 'MediaType' });

@ObjectType('LibraryGenre')
export class LibraryGenreType {
    @Field(() => ID) id: string;
    @Field() name: string;
}

@ObjectType('LibraryMediaItem')
export class LibraryMediaItemType {
    @Field(() => ID) id: string;
    @Field() title: string;
    @Field(() => MediaType) type: MediaType;
    @Field(() => String, { nullable: true }) coverUrl: string | null;
    @Field(() => Int) releaseYear: number;
    @Field() creator: string;
    @Field(() => Int, { nullable: true }) pages: number | null;
    @Field(() => Int, { nullable: true }) durationMinutes: number | null;
    @Field(() => String, { nullable: true }) platform: string | null;
    @Field(() => Float) averageRating: number;
    @Field(() => Int) ratingsCount: number;
    @Field(() => [LibraryGenreType]) genres: LibraryGenreType[];
}

@ObjectType('LibraryEntry')
export class LibraryEntryType {
    @Field(() => ID) id: string;
    @Field(() => LibraryStatus) status: LibraryStatus;
    @Field(() => Int) progress: number;
    @Field(() => Int, { nullable: true }) rating: number | null;
    @Field() isFavorite: boolean;
    @Field(() => String, { nullable: true }) notes: string | null;
    @Field(() => Date, { nullable: true }) startedAt: Date | null;
    @Field(() => Date, { nullable: true }) completedAt: Date | null;
    @Field(() => Date) addedAt: Date;
    @Field(() => Date) updatedAt: Date;
    @Field(() => LibraryMediaItemType) mediaItem: LibraryMediaItemType;
}

@ObjectType('LibraryPageMeta')
export class LibraryPageMetaType {
    @Field(() => Int) total: number;
    @Field(() => Int) page: number;
    @Field(() => Int) limit: number;
    @Field(() => Int) totalPages: number;
}

@ObjectType('PaginatedLibraryEntries')
export class PaginatedLibraryEntriesType {
    @Field(() => [LibraryEntryType]) data: LibraryEntryType[];
    @Field(() => LibraryPageMetaType) meta: LibraryPageMetaType;
}
