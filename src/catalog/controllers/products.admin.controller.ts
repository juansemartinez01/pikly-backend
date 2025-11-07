import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../admin/auth/admin.guard';
import { ProductsService } from '../services/products.service';
import { CreateProductDto } from '../dto/create-product.dto';
import * as updateProductDto from '../dto/update-product.dto';

@UseGuards(AdminGuard)
@Controller('admin/products')
export class ProductsAdminController {
  constructor(private svc: ProductsService) {}

  // Lista admin (incluye filtros básicos y borrados opcionales)
  @Get()
  async adminList(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('active') active?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.adminList({
      q: q || '',
      category: category || undefined,
      includeDeleted: includeDeleted === 'true',
      active: typeof active === 'string' ? active : undefined,
      page: Number(page || 1),
      limit: Number(limit || 20),
    });
  }

  @Get(':id')
  async adminGet(@Param('id') id: string) {
    return this.svc.adminById(id);
  }

  @Post()
  async create(@Body() dto: CreateProductDto) {
    return this.svc.createProduct(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: updateProductDto.UpdateProductDto,
  ) {
    return this.svc.updateProduct(id, dto);
  }

  @Delete(':id')
  async softDelete(@Param('id') id: string) {
    return this.svc.softDeleteProduct(id);
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string) {
    return this.svc.restoreProduct(id);
  }

  @Patch(':id/activate')
  async activate(@Param('id') id: string) {
    return this.svc.setActive(id, true);
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.svc.setActive(id, false);
  }
}
