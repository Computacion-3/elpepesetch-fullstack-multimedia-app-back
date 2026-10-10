import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../auth/constants/auth.constants.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { ApiAuthenticated } from '../../common/swagger/api-protected.decorator.js';
import { ReportStatus } from '../enums/library.enums.js';
import { CreateReviewReportDto } from './dto/create-review-report.dto.js';
import { ResolveReviewReportDto } from './dto/resolve-review-report.dto.js';
import { ReviewReportQueryDto } from './dto/review-report-query.dto.js';
import { ReviewReportService } from './review-report.service.js';

@Controller()
@ApiAuthenticated()
@ApiTags('Reports')
export class ReviewReportController {
    constructor(private readonly reviewReportService: ReviewReportService) {}

    @Post('reviews/:reviewId/report')
    @Permissions(PERMISSIONS.REPORTS_CREATE)
    @ApiOperation({ summary: 'Reportar una reseña ajena una sola vez' })
    @ApiParam({ name: 'reviewId', format: 'uuid' })
    @ApiBody({ type: CreateReviewReportDto })
    @ApiResponse({ status: 201, description: 'Reporte creado con estado OPEN' })
    @ApiResponse({ status: 400, description: 'No se puede reportar una reseña propia' })
    @ApiResponse({ status: 403, description: 'El rol no tiene permiso para reportar reseñas' })
    @ApiResponse({ status: 409, description: 'El usuario ya reportó esta reseña' })
    create(
        @CurrentUser() user: AuthenticatedUser,
        @Param('reviewId', new ParseUUIDPipe()) reviewId: string,
        @Body() dto: CreateReviewReportDto,
    ) {
        return this.reviewReportService.create(user.id, reviewId, dto);
    }

    @Get('reports')
    @Permissions(PERMISSIONS.REVIEWS_MODERATE)
    @ApiOperation({ summary: 'Consultar reportes para moderación' })
    @ApiQuery({ name: 'status', required: false, enum: ReportStatus })
    @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, minimum: 1, maximum: 50 })
    @ApiResponse({ status: 200, description: 'Reportes paginados, opcionalmente filtrados por estado' })
    @ApiResponse({ status: 403, description: 'Solo moderadores y administradores pueden consultar reportes' })
    findAll(@Query() query: ReviewReportQueryDto) {
        return this.reviewReportService.findAll(query);
    }

    @Patch('reports/:id/resolve')
    @Permissions(PERMISSIONS.REVIEWS_MODERATE)
    @ApiOperation({ summary: 'Resolver un reporte con HIDE o DISMISS' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiBody({ type: ResolveReviewReportDto })
    @ApiResponse({ status: 200, description: 'Reporte resuelto; HIDE lo oculta y DISMISS lo mantiene visible' })
    @ApiResponse({ status: 400, description: 'Falta el motivo para HIDE' })
    @ApiResponse({ status: 409, description: 'El reporte ya fue resuelto' })
    @ApiResponse({ status: 404, description: 'Reporte inexistente' })
    @ApiResponse({ status: 403, description: 'Solo moderadores y administradores pueden moderar reseñas' })
    resolve(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: ResolveReviewReportDto,
    ) {
        return this.reviewReportService.resolve(id, user.id, dto);
    }
}
