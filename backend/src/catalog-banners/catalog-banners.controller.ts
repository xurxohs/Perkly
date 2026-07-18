import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CatalogBannersService } from './catalog-banners.service';

@Controller('catalog-banners')
export class CatalogBannersController {
  constructor(private readonly service: CatalogBannersService) {}

  @Get()
  listPublic() { return this.service.listPublic(); }

  @Get('admin/all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  listAdmin() { return this.service.listAdmin(); }

  @Post('admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  create(@Body() body: Record<string, unknown>) { return this.service.create(body); }

  @Patch('admin/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.update(id, body); }

  @Delete('admin/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
