import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, Repository } from 'typeorm';

import { PERMISSIONS } from '../../auth/constants/auth.constants.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { isForeignKeyViolation, isUniqueViolation } from '../../common/database/pg-errors.js';
import { Genre } from '../entities/genre.entity.js';
import { MediaItem } from '../entities/media-item.entity.js';
import { ApprovalStatus } from '../enums/library.enums.js';
import { ApproveMediaItemDto } from './dto/approve-media-item.dto.js';
import { CreateMediaItemDto } from './dto/create-media-item.dto.js';
import { MediaQueryDto } from './dto/media-query.dto.js';
import { UpdateMediaItemDto } from './dto/update-media-item.dto.js';

export interface PaginatedMediaItems {
    data: MediaItem[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

const ADMIN_ROLE = 'ADMIN';

@Injectable()
export class MediaItemService {
    constructor(
        @InjectRepository(MediaItem) private readonly repository: Repository<MediaItem>,
        @InjectRepository(Genre) private readonly genreRepository: Repository<Genre>,
    ) {}

    /** Un elemento lo propone un usuario (PENDING) o lo crea un administrador (APPROVED). */
    async create(user: AuthenticatedUser, dto: CreateMediaItemDto): Promise<MediaItem> {
        const { genreIds, ...data } = dto;
        this.assertReleaseYear(data.releaseYear);
        const item = this.repository.create({
            ...data,
            genres: await this.resolveGenres(genreIds),
            createdBy: { id: user.id },
            approvalStatus: user.role === ADMIN_ROLE ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING,
            rejectionReason: null,
        });
        return this.saveOrConflict(item);
    }

    /** Catálogo aprobado más los elementos pendientes propuestos por quien consulta, con filtros y paginación. */
    async findAll(viewer: AuthenticatedUser, query: MediaQueryDto): Promise<PaginatedMediaItems> {
        const filters: FindOptionsWhere<MediaItem> = {};
        if (query.type) filters.type = query.type;
        if (query.year !== undefined) filters.releaseYear = query.year;
        if (query.genreId) filters.genres = { id: query.genreId };

        const visibility: FindOptionsWhere<MediaItem>[] = [
            { approvalStatus: ApprovalStatus.APPROVED },
            { approvalStatus: ApprovalStatus.PENDING, createdBy: { id: viewer.id } },
        ];
        const text = query.q?.trim();
        const like = text ? ILike(`%${escapeLike(text)}%`) : undefined;
        // Un arreglo de condiciones es un OR: (aprobado o propio pendiente) × (título o creador)
        const where: FindOptionsWhere<MediaItem>[] = visibility.flatMap((visible) =>
            like
                ? [
                      { ...filters, ...visible, title: like },
                      { ...filters, ...visible, creator: like },
                  ]
                : [{ ...filters, ...visible }],
        );

        const [data, total] = await this.repository.findAndCount({
            where,
            relations: { genres: true },
            order: { [query.sortBy]: query.order, id: 'ASC' },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        });
        return paginate(data, total, query);
    }

    /** Detalle con géneros, promedio y cantidad de calificaciones. Un pendiente solo lo ven su creador y los moderadores. */
    async findOne(viewer: AuthenticatedUser, id: string): Promise<MediaItem> {
        const item = await this.findWithRelations(id);
        const visible =
            item.approvalStatus === ApprovalStatus.APPROVED ||
            item.createdBy?.id === viewer.id ||
            viewer.permissions.includes(PERMISSIONS.CATALOG_MODERATE);
        if (!visible) throw new NotFoundException(`Media item ${id} not found`);
        return item;
    }

    /** Elementos esperando revisión, los más antiguos primero. */
    async findPending(query: MediaQueryDto): Promise<PaginatedMediaItems> {
        const [data, total] = await this.repository.findAndCount({
            where: { approvalStatus: ApprovalStatus.PENDING },
            relations: { genres: true, createdBy: true },
            order: { createdAt: 'ASC' },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        });
        return paginate(data, total, query);
    }

    /** El creador edita mientras el elemento esté PENDING; el administrador edita siempre. */
    async update(user: AuthenticatedUser, id: string, dto: UpdateMediaItemDto): Promise<MediaItem> {
        const item = await this.findWithRelations(id);
        if (user.role !== ADMIN_ROLE) {
            if (item.createdBy?.id !== user.id) {
                throw new ForbiddenException('Solo el creador o un administrador pueden editar este elemento');
            }
            if (item.approvalStatus !== ApprovalStatus.PENDING) {
                throw new ForbiddenException('Solo puedes editar tu propuesta mientras esté pendiente de aprobación');
            }
        }
        const { genreIds, ...data } = dto;
        if (data.releaseYear !== undefined) this.assertReleaseYear(data.releaseYear);
        this.repository.merge(item, data);
        if (genreIds !== undefined) item.genres = await this.resolveGenres(genreIds);
        return this.saveOrConflict(item);
    }

    /** Un moderador aprueba o rechaza (con motivo) un elemento pendiente. */
    async setApproval(id: string, dto: ApproveMediaItemDto): Promise<MediaItem> {
        const reason = dto.rejectionReason?.trim();
        if (dto.approvalStatus === ApprovalStatus.REJECTED && !reason) {
            throw new BadRequestException('rejectionReason es obligatorio al rechazar un elemento');
        }
        const item = await this.findWithRelations(id);
        if (item.approvalStatus !== ApprovalStatus.PENDING) {
            throw new ConflictException(`El elemento ya fue revisado (${item.approvalStatus})`);
        }
        item.approvalStatus = dto.approvalStatus;
        item.rejectionReason = dto.approvalStatus === ApprovalStatus.REJECTED ? (reason ?? null) : null;
        return this.repository.save(item);
    }

    async remove(id: string): Promise<{ message: string }> {
        const item = await this.findWithRelations(id);
        try {
            await this.repository.remove(item);
        } catch (error) {
            if (isForeignKeyViolation(error)) {
                throw new ConflictException('El elemento está en uso y no se puede eliminar');
            }
            throw error;
        }
        return { message: `Media item ${id} deleted successfully` };
    }

    private async findWithRelations(id: string): Promise<MediaItem> {
        const item = await this.repository.findOne({ where: { id }, relations: { genres: true, createdBy: true } });
        if (!item) throw new NotFoundException(`Media item ${id} not found`);
        return item;
    }

    private async resolveGenres(genreIds: string[]): Promise<Genre[]> {
        const genres = await this.genreRepository.findBy({ id: In(genreIds) });
        if (genres.length !== new Set(genreIds).size) {
            throw new BadRequestException('Uno o más géneros indicados no existen');
        }
        return genres;
    }

    /** releaseYear: entre 1900 (validado en el DTO) y el año actual + 5. */
    private assertReleaseYear(year: number): void {
        const max = new Date().getFullYear() + 5;
        if (year > max) throw new BadRequestException(`releaseYear no puede ser mayor que ${max}`);
    }

    private async saveOrConflict(item: MediaItem): Promise<MediaItem> {
        try {
            return await this.repository.save(item);
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw new ConflictException('Ya existe un elemento con ese título, tipo y año de lanzamiento');
            }
            throw error;
        }
    }
}

function paginate(data: MediaItem[], total: number, query: MediaQueryDto): PaginatedMediaItems {
    return {
        data,
        meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) },
    };
}

/** Escapa los comodines de LIKE para que `%` y `_` en la búsqueda se traten como texto. */
function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
}
