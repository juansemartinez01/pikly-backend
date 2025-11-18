import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OpsService } from '../services/ops.service';
import { AdminGuard } from '../../admin/auth/admin.guard';
import { ListOrdersDto } from '../dto/list-orders.dto';
import { AssignDriverDto } from '../dto/assign-driver.dto';
import { UpdateStatusDto } from '../dto/update-status.dto';
import { MarkDeliveredDto } from '../dto/mark-delivered.dto';
import { AdjustStockDto } from '../dto/adjust-stock.dto';

@UseGuards(AdminGuard)
@Controller('admin/orders')
export class OpsController {
  constructor(private ops: OpsService) {}

  // --------- STOCK (admin) ---------

  // GET /v1/admin/orders/stock?warehouseId=... (opcional)
  @Get('stock')
  listStock(@Query('warehouseId') warehouseId?: string) {
    return this.ops.listStock(warehouseId);
  }

  // GET /v1/admin/orders/stock/product/:productId?warehouseId=...
  @Get('stock/product/:productId')
  stockForProduct(
    @Param('productId') productId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.ops.stockForProduct(productId, warehouseId);
  }

  @Get()
  list(@Query() q: ListOrdersDto) {
    return this.ops.list(q);
  }

  @Patch(':number/status')
  updateStatus(@Param('number') number: string, @Body() dto: UpdateStatusDto) {
    return this.ops.updateStatus(number, dto);
  }

  @Post(':number/assign-driver')
  assign(@Param('number') number: string, @Body() dto: AssignDriverDto) {
    return this.ops.assignDriver(number, dto);
  }

  @Post(':number/delivered')
  delivered(@Param('number') number: string, @Body() dto: MarkDeliveredDto) {
    return this.ops.markDelivered(number, dto);
  }

  // POST /v1/admin/orders/stock/product/:productId/add
  @Post('stock/product/:productId/add')
  addStock(@Param('productId') productId: string, @Body() dto: AdjustStockDto) {
    return this.ops.addStock(productId, dto);
  }
}
