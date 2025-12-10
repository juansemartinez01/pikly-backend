import { Controller, Get, Query } from '@nestjs/common';
import { CombosService } from '../services/combos.service';

@Controller('combos')
export class CombosController {
  constructor(private svc: CombosService) {}
  @Get()
  async list(@Query('priceListId') priceListId?: string) {
    return this.svc.list(priceListId);
  }
}
