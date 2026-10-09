import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../auth/constants/auth.constants.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { ApiAuthenticated } from '../../common/swagger/api-protected.decorator.js';
import { ActivityQueryDto } from '../activity_logs/dto/activity-query.dto.js';
import { ReviewService } from './review.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';

@Controller()
@ApiAuthenticated()
@ApiTags('Reviews')
export class ReviewController {
    constructor(private readonly reviewService: ReviewService) {}

    @Post('media/:mediaItemId/reviews')
    @Permissions(PERMISSIONS.REVIEWS_CREATE)
    @ApiOperation({ summary: 'Crear una reseña para un elemento de la biblioteca propia' })
    @ApiParam({ name: 'mediaItemId', format: 'uuid' })
    @ApiBody({ type: CreateReviewDto })
    @ApiResponse({ status: 201, description: 'Reseña creada' })
    @ApiResponse({ status: 400, description: 'El usuario no tiene una entrada elegible en su biblioteca' })
    @ApiResponse({ status: 403, description: 'El rol no tiene permiso para crear reseñas' })
    @ApiResponse({ status: 409, description: 'Ya existe una reseña para este elemento' })
    create(
        @CurrentUser() user: AuthenticatedUser,
        @Param('mediaItemId', new ParseUUIDPipe()) mediaItemId: string,
        @Body() dto: CreateReviewDto,
    ) {
        return this.reviewService.create(user.id, mediaItemId, dto);
    }

    @Get('media/:mediaItemId/reviews')
    @ApiOperation({ summary: 'Listar reseñas visibles de un elemento' })
    @ApiParam({ name: 'mediaItemId', format: 'uuid' })
    @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, minimum: 1, maximum: 50 })
    @ApiResponse({
        status: 200,
        description: 'Reseñas paginadas; las ocultas solo se muestran a su autor y moderadores',
    })
    findByMediaItem(
        @CurrentUser() user: AuthenticatedUser,
        @Param('mediaItemId', new ParseUUIDPipe()) mediaItemId: string,
        @Query() query: ActivityQueryDto,
    ) {
        return this.reviewService.findByMediaItem(
            mediaItemId,
            user.id,
            user.permissions.includes(PERMISSIONS.REVIEWS_MODERATE),
            query.page,
            query.limit,
        );
    }

    @Patch('reviews/:id')
    @Permissions(PERMISSIONS.REVIEWS_UPDATE)
    @ApiOperation({ summary: 'Editar una reseña propia (el administrador puede editar cualquiera)' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiBody({ type: UpdateReviewDto })
    @ApiResponse({ status: 200, description: 'Reseña actualizada' })
    @ApiResponse({ status: 403, description: 'La reseña pertenece a otro usuario' })
    @ApiResponse({ status: 404, description: 'Reseña inexistente' })
    update(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: UpdateReviewDto,
    ) {
        return this.reviewService.update(id, user.id, user.role, dto);
    }

    @Delete('reviews/:id')
    @Permissions(PERMISSIONS.REVIEWS_DELETE)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eliminar una reseña propia (el administrador puede eliminar cualquiera)' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiResponse({ status: 204, description: 'Reseña eliminada' })
    @ApiResponse({ status: 403, description: 'La reseña pertenece a otro usuario' })
    @ApiResponse({ status: 404, description: 'Reseña inexistente' })
    remove(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
        return this.reviewService.remove(id, user.id, user.role);
    }
}
