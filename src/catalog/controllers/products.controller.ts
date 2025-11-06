import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from '../services/products.service';
import { ProductQueryDto } from '../dto/product-query.dto';

@Controller('products')
export class ProductsController {
  constructor(private svc: ProductsService) {}

  @Get()
  async list(@Query() q: ProductQueryDto) {
    return this.svc.list(q);
  }

  @Get(':slug')
  async bySlug(@Param('slug') slug: string) {
    return this.svc.bySlug(slug);
  }
}
