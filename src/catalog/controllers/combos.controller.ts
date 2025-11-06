import { Controller, Get } from '@nestjs/common';
import { CombosService } from '../services/combos.service';

@Controller('combos')
export class CombosController {
  constructor(private svc: CombosService) {}
  @Get()
  async list() {
    return this.svc.list();
  }
}
