import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
    Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { ActivityAction } from '../activity_logs/entities/activity_log.entity.js';
import { ActivityLogsService } from '../activity_logs/activity_logs.service.js';
import { AddListItemDto } from './dto/add-list-item.dto.js';
import { CreateUserListDto } from './dto/create-user_list.dto.js';
import { ListQueryDto } from './dto/list-query.dto.js';
import { UpdateUserListDto } from './dto/update-user_list.dto.js';
import { ListVisibility, UserList } from './entities/user_list.entity.js';
import {
    LISTS_CONTEXT,
    ListMediaApprovalStatus,
} from './lists-context.js';
import type { ListsContext } from './lists-context.js';

@Injectable()
export class UserListsService {
    constructor(
        @Optional() @InjectRepository(UserList)
        private readonly repository: Repository<UserList>,
        @Optional() private readonly activityLogsService?: ActivityLogsService,
        @Optional() @Inject(LISTS_CONTEXT)
        private readonly listsContext?: ListsContext,
    ) {}

    async create(ownerId: string, dto: CreateUserListDto): Promise<UserList> {
        this.requireUserId(ownerId);
        const duplicate = await this.repository.findOne({ where: { ownerId, name: dto.name } });
        if (duplicate) throw new ConflictException('List name already exists for this owner');

        const list = await this.repository.save(this.repository.create({
            ownerId,
            name: dto.name,
            description: dto.description ?? null,
            visibility: dto.visibility ?? ListVisibility.PRIVATE,
            itemIds: [],
        }));
        await this.activityLogsService?.create(ownerId, { action: ActivityAction.LIST_CREATED });
        return list;
    }

    async findAll(ownerId: string): Promise<UserList[]> {
        this.requireUserId(ownerId);
        return this.repository.find({ where: { ownerId }, order: { createdAt: 'DESC' } });
    }

    async findPublic(ownerId: string, query: ListQueryDto): Promise<PublicListsResponse> {
        this.requireUserId(ownerId);
        const [lists, total] = await this.repository.findAndCount({
            where: { visibility: ListVisibility.PUBLIC, ownerId: Not(ownerId) },
            order: { createdAt: 'DESC' },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        });

        const data = await Promise.all(lists.map((list) => this.withOwnerUsername(list)));
        return {
            data,
            meta: {
                total,
                page: query.page,
                limit: query.limit,
                totalPages: Math.ceil(total / query.limit),
            },
        };
    }

    async findOne(viewerId: string, id: string): Promise<UserList> {
        this.requireUserId(viewerId);
        const list = await this.repository.findOne({ where: { id } });
        if (!list || (list.visibility === ListVisibility.PRIVATE && list.ownerId !== viewerId)) {
            throw new NotFoundException('List not found');
        }
        return list;
    }

    async update(ownerId: string, id: string, dto: UpdateUserListDto): Promise<UserList> {
        const list = await this.findOwnedList(ownerId, id);
        if (dto.name && dto.name !== list.name) {
            const duplicate = await this.repository.findOne({ where: { ownerId, name: dto.name } });
            if (duplicate) throw new ConflictException('List name already exists for this owner');
        }
        Object.assign(list, dto);
        return this.repository.save(list);
    }

    async remove(ownerId: string, id: string): Promise<void> {
        const list = await this.findOwnedList(ownerId, id);
        await this.repository.remove(list);
    }

    async addItem(ownerId: string, id: string, dto: AddListItemDto): Promise<UserList> {
        const list = await this.findOwnedList(ownerId, id);
        const mediaItem = await this.listsContext?.findMediaItem(dto.mediaItemId);
        if (!mediaItem) {
            // TODO: require a real MediaItem lookup once the media module is available.
        } else if (mediaItem.approvalStatus !== ListMediaApprovalStatus.APPROVED) {
            throw new BadRequestException('Only approved media items can be added to a list');
        }
        if (list.itemIds.includes(dto.mediaItemId)) {
            throw new ConflictException('The media item is already in the list');
        }
        list.itemIds = [...list.itemIds, dto.mediaItemId];
        return this.repository.save(list);
    }

    async removeItem(ownerId: string, id: string, mediaItemId: string): Promise<UserList> {
        const list = await this.findOwnedList(ownerId, id);
        if (!list.itemIds.includes(mediaItemId)) {
            throw new NotFoundException('Media item is not in the list');
        }
        list.itemIds = list.itemIds.filter((itemId) => itemId !== mediaItemId);
        return this.repository.save(list);
    }

    private async findOwnedList(ownerId: string, id: string): Promise<UserList> {
        this.requireUserId(ownerId);
        const list = await this.repository.findOne({ where: { id } });
        if (!list) throw new NotFoundException('List not found');
        if (list.ownerId !== ownerId) throw new ForbiddenException('You do not own this list');
        return list;
    }

    private async withOwnerUsername(list: UserList): Promise<PublicListView> {
        const username = await this.listsContext?.findOwnerUsername(list.ownerId);
        return { ...list, ownerUsername: username ?? null };
    }

    private requireUserId(userId: string): void {
        // TODO: replace x-user-id with the authenticated user from the future auth guard.
        if (!userId) throw new BadRequestException('Authenticated user id is required');
    }
}

export interface PublicListView extends UserList {
    ownerUsername: string | null;
}

export interface PublicListsResponse {
    data: PublicListView[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
