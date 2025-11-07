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

@UseGuards(AdminGuard)
@Controller('admin/orders')
export class OpsController {
  constructor(private ops: OpsService) {}

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
}
