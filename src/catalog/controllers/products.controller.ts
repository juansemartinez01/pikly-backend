import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from '../services/products.service';
import { ProductQueryDto } from '../dto/product-query.dto';
import { OpsService } from 'src/ops/services/ops.service';

@Controller('products')
export class ProductsController {
  constructor(
    private svc: ProductsService,
    private readonly ops: OpsService,
  ) {}

  /**
   * GET /v1/stock/available
   * GET /v1/stock/available?warehouseId=<uuid|null>
   *
   * Respuesta:
   * [
   *   {
   *     product: { id, sku, name },
   *     warehouseId: null,
   *     stockCurrent: 10,
   *     reserved: 3,
   *     available: 7
   *   },
   *   ...
   * ]
   */
  @Get('available')
  listAvailable(@Query('warehouseId') warehouseId?: string) {
    return this.ops.listAvailableStock(warehouseId);
  }

  @Get(':slug')
  async bySlug(@Param('slug') slug: string) {
    return this.svc.bySlug(slug);
  }

  @Get()
  async list(@Query() q: ProductQueryDto) {
    return this.svc.list(q);
  }
}
