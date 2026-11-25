import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Not, Repository } from 'typeorm';
import { ActivityLogsService } from '../activity_logs/activity_logs.service.js';
import { AddListItemDto } from './dto/add-list-item.dto.js';
import { CreateUserListDto } from './dto/create-user_list.dto.js';
import { ListQueryDto } from './dto/list-query.dto.js';
import { UpdateUserListDto } from './dto/update-user_list.dto.js';
import { UserList } from '../entities/user_list.entity.js';
import { MediaItem } from '../entities/media-item.entity.js';
import { ActivityAction, ApprovalStatus, ListVisibility } from '../enums/library.enums.js';
import { isUniqueViolation } from '../../common/database/pg-errors.js';
import type { UserListChangedEvent } from './user-list.events.js';

@Injectable()
export class UserListsService {
    constructor(
        @InjectRepository(UserList) private readonly repository: Repository<UserList>,
        @InjectRepository(MediaItem) private readonly mediaRepository: Repository<MediaItem>,
        private readonly activityLogsService: ActivityLogsService,
        private readonly events: EventEmitter2,
    ) {}

    async create(ownerId: number, dto: CreateUserListDto): Promise<UserList> {
        const duplicate = await this.repository.findOne({ where: { owner: { id: ownerId }, name: dto.name } });
        if (duplicate) throw new ConflictException('List name already exists for this owner');
        const list = this.repository.create({
            owner: { id: ownerId },
            name: dto.name,
            description: dto.description ?? null,
            visibility: dto.visibility ?? ListVisibility.PRIVATE,
            items: [],
        });
        let saved: UserList;
        try {
            saved = await this.repository.save(list);
        } catch (error) {
            if (isUniqueViolation(error)) throw new ConflictException('List name already exists for this owner');
            throw error;
        }
        await this.activityLogsService.logActivity(ownerId, { action: ActivityAction.LIST_CREATED });
        await this.emitListEvent({
            ownerId,
            event: 'list.created',
            payload: {
                listId: saved.id,
                name: saved.name,
                visibility: saved.visibility,
                createdAt: saved.createdAt.toISOString(),
            },
        });
        return saved;
    }

    findAll(ownerId: number, loadGenres = false): Promise<UserList[]> {
        return this.repository.find({
            where: { owner: { id: ownerId } },
            relations: { owner: true, items: loadGenres ? { genres: true } : true },
            order: { createdAt: 'DESC' },
        });
    }

    async findPublic(ownerId: number, query: ListQueryDto, loadGenres = false): Promise<PublicListsResponse> {
        const [lists, total] = await this.repository.findAndCount({
            where: { visibility: ListVisibility.PUBLIC, owner: { id: Not(ownerId) } },
            relations: { owner: true, items: loadGenres ? { genres: true } : true },
            order: { createdAt: 'DESC' },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        });
        return {
            data: lists.map((list) => ({ ...list, ownerUsername: list.owner.username })),
            meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) },
        };
    }

    async findOne(viewerId: number, id: string, loadGenres = false): Promise<UserList> {
        const list = await this.repository.findOne({
            where: { id },
            relations: { owner: true, items: loadGenres ? { genres: true } : true },
        });
        if (!list || (list.visibility === ListVisibility.PRIVATE && list.owner.id !== viewerId)) {
            throw new NotFoundException('List not found');
        }
        return list;
    }

    async update(ownerId: number, id: string, dto: UpdateUserListDto, loadGenres = false): Promise<UserList> {
        const list = await this.findOwnedList(ownerId, id, loadGenres);
        if (dto.name && dto.name !== list.name) {
            const duplicate = await this.repository.findOne({ where: { owner: { id: ownerId }, name: dto.name } });
            if (duplicate) throw new ConflictException('List name already exists for this owner');
        }
        const changed = Object.entries(dto).some(([key, value]) => list[key as keyof UserList] !== value);
        if (!changed) return list;
        Object.assign(list, dto);
        let saved: UserList;
        try {
            saved = await this.repository.save(list);
        } catch (error) {
            if (isUniqueViolation(error)) throw new ConflictException('List name already exists for this owner');
            throw error;
        }
        await this.emitListEvent({
            ownerId,
            event: 'list.updated',
            payload: {
                listId: saved.id,
                name: saved.name,
                description: saved.description,
                visibility: saved.visibility,
                updatedAt: saved.updatedAt.toISOString(),
            },
        });
        return saved;
    }

    async remove(ownerId: number, id: string): Promise<void> {
        const list = await this.findOwnedList(ownerId, id);
        await this.repository.remove(list);
        await this.emitListEvent({ ownerId, event: 'list.deleted', payload: { listId: list.id } });
    }

    async addItem(ownerId: number, id: string, dto: AddListItemDto, loadGenres = false): Promise<UserList> {
        const list = await this.findOwnedList(ownerId, id, loadGenres);
        const mediaItem = await this.mediaRepository.findOne({
            where: { id: dto.mediaItemId },
            relations: loadGenres ? { genres: true } : undefined,
        });
        if (!mediaItem) throw new NotFoundException(`Media item ${dto.mediaItemId} not found`);
        if (mediaItem.approvalStatus !== ApprovalStatus.APPROVED) {
            throw new BadRequestException('Only approved media items can be added to a list');
        }
        if (list.items.some((item) => item.id === mediaItem.id))
            throw new ConflictException('The media item is already in the list');
        list.items = [...list.items, mediaItem];
        let saved: UserList;
        try {
            saved = await this.repository.save(list);
        } catch (error) {
            if (isUniqueViolation(error)) throw new ConflictException('The media item is already in the list');
            throw error;
        }
        await this.emitListEvent({
            ownerId,
            event: 'list.item.added',
            payload: { listId: saved.id, mediaItemId: mediaItem.id, addedAt: new Date().toISOString() },
        });
        return saved;
    }

    async removeItem(ownerId: number, id: string, mediaItemId: string): Promise<UserList> {
        const list = await this.findOwnedList(ownerId, id);
        if (!list.items.some((item) => item.id === mediaItemId))
            throw new NotFoundException('Media item is not in the list');
        list.items = list.items.filter((item) => item.id !== mediaItemId);
        const saved = await this.repository.save(list);
        await this.emitListEvent({
            ownerId,
            event: 'list.item.removed',
            payload: { listId: saved.id, mediaItemId },
        });
        return saved;
    }

    private async findOwnedList(ownerId: number, id: string, loadGenres = false): Promise<UserList> {
        const list = await this.repository.findOne({
            where: { id },
            relations: { owner: true, items: loadGenres ? { genres: true } : true },
        });
        if (!list) throw new NotFoundException('List not found');
        if (list.owner.id !== ownerId) throw new ForbiddenException('You do not own this list');
        return list;
    }

    private emitListEvent(event: UserListChangedEvent): Promise<unknown[]> {
        return this.events.emitAsync('user-list.changed', event);
    }
}

export interface PublicListView extends UserList {
    ownerUsername: string;
}
export interface PublicListsResponse {
    data: PublicListView[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}
