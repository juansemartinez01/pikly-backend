import { Controller, Get, Query } from '@nestjs/common';
import { CmsService } from '../services/cms.service';

@Controller('cms')
export class CmsController {
  constructor(private svc: CmsService) {}

  @Get('banners')
  banners(@Query('position') position: string) {
    const pos = position || 'home-hero';
    return this.svc.listBanners(pos);
  }

  @Get('setting')
  setting(@Query('key') key: string) {
    return this.svc.getSetting(key);
  }
}
