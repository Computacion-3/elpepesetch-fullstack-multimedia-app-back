import { ArgsType, Field, Int } from '@nestjs/graphql';
import { ActivityQueryDto } from '../dto/activity-query.dto.js';

@ArgsType()
export class ActivityQueryArgs extends ActivityQueryDto {
    @Field(() => Int, { nullable: true }) declare page: number;
    @Field(() => Int, { nullable: true }) declare limit: number;
}
