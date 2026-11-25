import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { ActivityQueryArgs } from './graphql/activity.inputs.js';
import { ActivityPaginationType } from './graphql/activity.types.js';
import { ActivityLogsService } from './activity_logs.service.js';

@Resolver(() => ActivityPaginationType)
export class ActivityLogsResolver {
    constructor(private readonly activityLogsService: ActivityLogsService) {}

    @Query(() => ActivityPaginationType)
    myActivity(@CurrentUser() user: AuthenticatedUser, @Args() query: ActivityQueryArgs) {
        return this.activityLogsService.findAll(user.id, query, true);
    }
}
