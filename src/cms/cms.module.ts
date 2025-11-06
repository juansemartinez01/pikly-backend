import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Banner } from './entities/banner.entity';
import { Setting } from './entities/setting.entity';
import { CmsController } from './controllers/cms.controller';
import { CmsAdminController } from './controllers/cms.admin.controller';
import { CmsService } from './services/cms.service';
import { AdminTokenGuard } from '../admin/auth/admin-token.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Banner, Setting])],
  controllers: [CmsController, CmsAdminController],
  providers: [CmsService, AdminTokenGuard],
})
export class CmsModule {}
