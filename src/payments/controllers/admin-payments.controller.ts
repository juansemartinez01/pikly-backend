import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../admin/auth/admin.guard';
import { AdminPaymentsService } from '../services/admin-payments.service';
import { ListPaymentsDto } from '../dto/list-payments.dto';
import { ManualUpdatePaymentDto } from '../dto/manual-update-payment.dto';

@UseGuards(AdminGuard)
@Controller('admin/payments') // /v1/admin/payments
export class AdminPaymentsController {
  constructor(private readonly svc: AdminPaymentsService) {}

  // GET /v1/admin/payments?orderNumber=&status=&provider=&page=&limit=
  @Get()
  list(@Query() q: ListPaymentsDto) {
    return this.svc.list(q);
  }

  // GET /v1/admin/payments/order/:orderNumber
  // Devuelve resumen + todos los pagos de esa orden
  @Get('order/:orderNumber')
  paymentsForOrder(@Param('orderNumber') orderNumber: string) {
    return this.svc.paymentsForOrder(orderNumber);
  }

  // PATCH /v1/admin/payments/order/:orderNumber/manual
  // Permite ajustar paymentStatus / orderStatus y crear un pago manual opcionalmente
  @Patch('order/:orderNumber/manual')
  manualUpdate(
    @Param('orderNumber') orderNumber: string,
    @Body() dto: ManualUpdatePaymentDto,
  ) {
    return this.svc.manualUpdate(orderNumber, dto);
  }
}
