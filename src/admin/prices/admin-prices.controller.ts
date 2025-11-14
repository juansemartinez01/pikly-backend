import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminPricesService } from './admin-prices.service';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { UpsertProductPriceDto } from './dto/upsert-product-price.dto';
import { BulkUpsertProductPriceDto } from '../prices/dto/bulk-upsert-product-price.dto';

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminPricesController {
  constructor(private readonly svc: AdminPricesService) {}

  // --------- PRICE LISTS ---------

  @Get('pricelists')
  listPriceLists() {
    return this.svc.listPriceLists();
  }

  @Post('pricelists')
  createPriceList(@Body() dto: CreatePriceListDto) {
    return this.svc.createPriceList(dto);
  }

  @Patch('pricelists/:id')
  updatePriceList(@Param('id') id: string, @Body() dto: UpdatePriceListDto) {
    return this.svc.updatePriceList(id, dto);
  }

  @Delete('pricelists/:id')
  deletePriceList(@Param('id') id: string) {
    return this.svc.deletePriceList(id);
  }

  // --------- PRODUCT PRICES ---------

  // Upsert individual
  @Post('prices/upsert')
  upsertPrice(@Body() dto: UpsertProductPriceDto) {
    return this.svc.upsertProductPrice(dto);
  }

  // Bulk upsert
  @Post('prices/bulk-upsert')
  bulkUpsert(@Body() body: BulkUpsertProductPriceDto) {
    return this.svc.bulkUpsertProductPrices(body);
  }

  // Ver precios de un producto
  @Get('products/:id/prices')
  getProductPrices(@Param('id') productId: string) {
    return this.svc.listPricesForProduct(productId);
  }
}
