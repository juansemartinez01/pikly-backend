import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CmsService } from '../services/cms.service';
import { AdminTokenGuard } from '../../admin/auth/admin-token.guard';

@UseGuards(AdminTokenGuard)
@Controller('admin/cms')
export class CmsAdminController {
  constructor(private svc: CmsService) {}

  @Post('setting')
  upsertSetting(@Body() body: { key: string; value: any }) {
    return this.svc.upsertSetting(body.key, body.value);
  }

  @Post('banners')
  create(@Body() b: any) {
    return this.svc.createBanner(b);
  }

  @Patch('banners/:id')
  update(@Param('id') id: string, @Body() b: any) {
    return this.svc.updateBanner(id, b);
  }

  @Delete('banners/:id')
  remove(@Param('id') id: string) {
    return this.svc.deleteBanner(id);
  }
}
