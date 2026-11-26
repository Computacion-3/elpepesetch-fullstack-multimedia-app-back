import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { ActivityAction } from '../../enums/library.enums.js';
import { LibraryMediaItemType, LibraryPageMetaType } from '../../library_entries/graphql/library.types.js';

registerEnumType(ActivityAction, { name: 'ActivityAction' });

@ObjectType('ActivityLog')
export class ActivityLogType {
    @Field(() => ID) id: string;
    @Field(() => ActivityAction) action: ActivityAction;
    @Field(() => Object, { nullable: true }) metadata: Record<string, unknown> | null;
    @Field(() => Date) createdAt: Date;
    @Field(() => LibraryMediaItemType, { nullable: true }) mediaItem: LibraryMediaItemType | null;
}

@ObjectType('ActivityPagination')
export class ActivityPaginationType {
    @Field(() => [ActivityLogType]) data: ActivityLogType[];
    @Field(() => LibraryPageMetaType) meta: LibraryPageMetaType;
}
