import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { DeliveryService } from '../services/delivery.service';
import { CreateDeliverySlotDto } from '../dto/create-delivery-slot.dto';
import * as upsertWeekdaySlotsDto from '../dto/upsert-weekday-slots.dto';

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

  // --------- PLANTILLAS POR DÍA ----------

  /**
   * Define TODAS las franjas de un día de la semana (LUNES, MARTES, etc.).
   * Sobrescribe lo que hubiera antes para ese día.
   *
   * Ej body:
   * {
   *   "weekday": "LUNES",
   *   "slots": [
   *     { "startTime": "10:00:00", "endTime": "13:00:00", "capacity": 80 },
   *     { "startTime": "14:00:00", "endTime": "18:00:00", "capacity": 100 }
   *   ]
   * }
   */
  @Post('weekday-slots')
  async upsertWeekdaySlots(@Body() dto: upsertWeekdaySlotsDto.UpsertWeekdaySlotsDto) {
    return this.svc.upsertWeekdaySlots(dto);
  }

  // Ver las plantillas de un día (LUNES, MARTES, etc.)
  @Get('weekday-slots/:weekday')
  async getWeekdaySlots(@Param('weekday') weekday: upsertWeekdaySlotsDto.WeekdayName) {
    return this.svc.getWeekdaySlots(weekday);
  }
}
