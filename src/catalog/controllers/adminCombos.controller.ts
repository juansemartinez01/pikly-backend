import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CombosService } from '../services/combos.service';
import { CreateComboDto } from '../dto/create-combo.dto';
import { UpdateComboDto } from '../dto/update-combo.dto';

@Controller('admin/combos')
export class AdminCombosController {
  constructor(private svc: CombosService) {}

  @Get()
  listAdmin() {
    return this.svc.adminList();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.svc.adminById(id);
  }

  @Post()
  create(@Body() dto: CreateComboDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateComboDto) {
    return this.svc.update(id, dto);
  }

  @Patch(':id/active')
  setActive(@Param('id') id: string, @Body('active') active: boolean) {
    return this.svc.setActive(id, active);
  }

  @Delete(':id')
  softDelete(@Param('id') id: string) {
    return this.svc.softDelete(id);
  }
}
