import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { DeliveryService } from '../services/delivery.service';
import { CreateDeliverySlotDto } from '../dto/create-delivery-slot.dto';

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

  // ➤ CREAR MANUALMENTE UNA FRANJA
  @Post('slots')
  async createSlot(@Body() dto: CreateDeliverySlotDto) {
    return this.svc.create(dto);
  }
}
