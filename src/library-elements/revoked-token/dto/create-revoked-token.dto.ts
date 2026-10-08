import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, MaxLength } from 'class-validator';
export class CreateRevokedTokenDto {
    @ApiProperty() @IsString() @MaxLength(64) jti: string;
    @ApiProperty() @IsDateString() expiresAt: string;
}
