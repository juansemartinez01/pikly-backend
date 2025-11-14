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
import { AdminCategoriesService } from '../products/admin-categories.service';
import { CreateCategoryDto } from '../../catalog/dto/create-category.dto';
import { UpdateCategoryDto } from '../../catalog/dto/update-category.dto';

@UseGuards(AdminGuard)
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly svc: AdminCategoriesService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
