import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Banner } from './entities/banner.entity';
import { Setting } from './entities/setting.entity';
import { CmsController } from './controllers/cms.controller';
import { CmsAdminController } from './controllers/cms.admin.controller';
import { CmsService } from './services/cms.service';
import { AdminGuard } from '../admin/auth/admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Banner, Setting])],
  controllers: [CmsController, CmsAdminController],
  providers: [CmsService, AdminGuard],
})
export class CmsModule {}
