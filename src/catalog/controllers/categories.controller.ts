import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from '../services/categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private svc: CategoriesService) {}
  @Get()
  async all() {
    return this.svc.allActive();
  }
}
