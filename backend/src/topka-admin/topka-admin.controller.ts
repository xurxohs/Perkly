import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  MediaVariant,
  TopkaAdminService,
  TopkaPostInput,
} from './topka-admin.service';

type AdminRequest = {
  user: {
    userId: string;
  };
};

@Controller('admin/topka')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class TopkaAdminController {
  constructor(private readonly topkaAdminService: TopkaAdminService) {}

  @Get('posts')
  async listPosts(
    @Query('status') status?: string,
    @Query('postType') postType?: string,
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.topkaAdminService.list({
      status,
      postType: postType || type,
      category,
      search,
      skip: Number(skip || 0),
      take: Number(take || 50),
    });
  }

  @Get('posts/:id')
  async getPost(@Param('id') id: string) {
    return this.topkaAdminService.get(id);
  }

  @Post('posts')
  async createPost(@Body() body: unknown, @Req() req: AdminRequest) {
    return this.topkaAdminService.create(
      body as TopkaPostInput,
      req.user.userId,
    );
  }

  @Patch('posts/:id')
  async updatePost(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AdminRequest,
  ) {
    return this.topkaAdminService.update(
      id,
      body as TopkaPostInput,
      req.user.userId,
    );
  }

  @Delete('posts/:id')
  async archivePost(@Param('id') id: string, @Req() req: AdminRequest) {
    return this.topkaAdminService.archive(id, req.user.userId);
  }

  @Post('media/upload')
  async uploadMedia(@Body() body: unknown) {
    return this.topkaAdminService.saveMedia(
      body as { fileName?: string; dataUrl?: string; variant?: MediaVariant },
    );
  }

  @Post('media/crop')
  async cropMedia(@Body() body: unknown) {
    return this.topkaAdminService.saveMedia(
      body as { fileName?: string; dataUrl?: string; variant?: MediaVariant },
    );
  }
}
