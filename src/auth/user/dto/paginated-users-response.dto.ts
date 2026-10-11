import { ApiProperty } from '@nestjs/swagger';

import { UserResponseDto } from './user-response.dto.js';

class PaginationMetaDto {
    @ApiProperty({ example: 42 })
    total: number;

    @ApiProperty({ example: 1 })
    page: number;

    @ApiProperty({ example: 10 })
    limit: number;

    @ApiProperty({ example: 5 })
    totalPages: number;
}

/** Respuesta de GET /users: una página de usuarios y los datos de paginación. */
export class PaginatedUsersResponseDto {
    @ApiProperty({ type: [UserResponseDto] })
    data: UserResponseDto[];

    @ApiProperty({ type: PaginationMetaDto })
    meta: PaginationMetaDto;
}
