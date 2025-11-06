import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from '../entities/banner.entity';
import { Setting } from '../entities/setting.entity';

@Injectable()
export class CmsService {
  constructor(
    @InjectRepository(Banner) private bannerRepo: Repository<Banner>,
    @InjectRepository(Setting) private settingRepo: Repository<Setting>,
  ) {}

  listBanners(position: string) {
    return this.bannerRepo.find({
      where: { position, active: true },
      order: { order: 'ASC' },
    });
  }

  async getSetting(key: string) {
    const s = await this.settingRepo.findOne({ where: { key } });
    return s?.value ?? null;
  }

  // Admin
  async upsertSetting(key: string, value: any) {
    await this.settingRepo.save({ key, value });
    return { key, value };
  }

  createBanner(b: Partial<Banner>) {
    return this.bannerRepo.save(this.bannerRepo.create(b));
  }
  updateBanner(id: string, b: Partial<Banner>) {
    return this.bannerRepo.update({ id }, b);
  }
  deleteBanner(id: string) {
    return this.bannerRepo.delete({ id });
  }
}
