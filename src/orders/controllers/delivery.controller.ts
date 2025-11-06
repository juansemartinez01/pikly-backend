import { Controller, Get, Query } from '@nestjs/common';
import { DeliveryService } from '../services/delivery.service';

@Controller('delivery')
export class DeliveryController {
  constructor(private svc: DeliveryService) {}

  @Get('slots')
  async slots(@Query('date') date: string) {
    if (!date) {
      const today = new Date().toISOString().slice(0, 10);
      return this.svc.list(today);
    }
    return this.svc.list(date);
  }
}
