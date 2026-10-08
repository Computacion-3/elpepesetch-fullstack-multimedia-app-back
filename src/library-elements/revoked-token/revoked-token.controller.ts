import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RevokedTokenService } from './revoked-token.service.js';
import { CreateRevokedTokenDto } from './dto/create-revoked-token.dto.js';
import { UpdateRevokedTokenDto } from './dto/update-revoked-token.dto.js';

@Controller('revoked-token')
export class RevokedTokenController {
    constructor(private readonly revokedTokenService: RevokedTokenService) {}

    @Post()
    create(@Body() createRevokedTokenDto: CreateRevokedTokenDto) {
        return this.revokedTokenService.create(createRevokedTokenDto);
    }

    @Get()
    findAll() {
        return this.revokedTokenService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.revokedTokenService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateRevokedTokenDto: UpdateRevokedTokenDto) {
        return this.revokedTokenService.update(id, updateRevokedTokenDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.revokedTokenService.remove(id);
    }
}
