import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiAuthenticated } from './common/swagger/api-protected.decorator.js';
import { AppService } from './app.service.js';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiAuthenticated()
  @ApiOperation({ summary: 'Mensaje de bienvenida (requiere autenticación)' })
  @ApiOkResponse({ description: 'Hello World!', type: String })
  getHello(): string {
    return this.appService.getHello();
  }
}
