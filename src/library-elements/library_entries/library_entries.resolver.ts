import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { CreateLibraryEntryDto } from './dto/create-library_entry.dto.js';
import { LibraryQueryDto } from './dto/library-query.dto.js';
import { UpdateLibraryEntryDto } from './dto/update-library_entry.dto.js';
import { LibraryEntriesService } from './library_entries.service.js';
import { AddLibraryEntryInput, LibraryFilterInput, UpdateLibraryEntryInput } from './graphql/library.inputs.js';
import { LibraryEntryType, PaginatedLibraryEntriesType } from './graphql/library.types.js';

@Resolver(() => LibraryEntryType)
export class LibraryEntriesResolver {
    constructor(private readonly libraryEntriesService: LibraryEntriesService) {}

    @Query(() => PaginatedLibraryEntriesType)
    myLibrary(
        @CurrentUser() user: AuthenticatedUser,
        @Args('filter', { type: () => LibraryFilterInput, nullable: true }) filter?: LibraryFilterInput,
    ) {
        return this.libraryEntriesService.findAll(user.id, Object.assign(new LibraryQueryDto(), filter));
    }

    @Query(() => LibraryEntryType)
    libraryEntry(
        @CurrentUser() user: AuthenticatedUser,
        @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    ) {
        return this.libraryEntriesService.findOne(user.id, id);
    }

    @Mutation(() => LibraryEntryType)
    addToLibrary(@CurrentUser() user: AuthenticatedUser, @Args('input') input: AddLibraryEntryInput) {
        return this.libraryEntriesService.create(user.id, Object.assign(new CreateLibraryEntryDto(), input));
    }

    @Mutation(() => LibraryEntryType)
    updateLibraryEntry(
        @CurrentUser() user: AuthenticatedUser,
        @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
        @Args('input') input: UpdateLibraryEntryInput,
    ) {
        return this.libraryEntriesService.update(user.id, id, Object.assign(new UpdateLibraryEntryDto(), input));
    }

    @Mutation(() => Boolean)
    async removeLibraryEntry(
        @CurrentUser() user: AuthenticatedUser,
        @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    ) {
        await this.libraryEntriesService.remove(user.id, id);
        return true;
    }
}
