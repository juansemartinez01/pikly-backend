// src/admin/controllers/admin-products.controller.ts
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
import { AdminGuard } from '../auth/admin.guard';
import { ProductsService } from '../../catalog/services/products.service';
import { CreateAdminProductDto } from './dto/create-admin-product.dto';
import type { UpdateProductDto } from '../../catalog/dto/update-product.dto';

@UseGuards(AdminGuard)
@Controller('admin/products') // => /v1/admin/products
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // GET /v1/admin/products?includeDeleted=&q=&category=&page=1&limit=20&active=
  @Get()
  adminList(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('active') active?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // 👇 parseo: "frutas,verduras"  => ["frutas","verduras"]
    const categories = category
      ? category
          .split(',')
          .map((c) => c.trim())
          .filter((c) => c.length > 0)
      : undefined;

    return this.productsService.adminList({
      q,
      categories,
      includeDeleted: includeDeleted === 'true',
      active,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }

  // GET /v1/admin/products/:id
  @Get(':id')
  adminById(@Param('id') id: string) {
    return this.productsService.adminById(id);
  }

  // POST /v1/admin/products
  @Post()
  create(@Body() dto: CreateAdminProductDto) {
    return this.productsService.create(dto);
  }

  // PATCH /v1/admin/products/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.updateProduct(id, dto);
  }

  // DELETE lógico /v1/admin/products/:id
  @Delete(':id')
  softDelete(@Param('id') id: string) {
    return this.productsService.softDeleteProduct(id);
  }

  // Restaurar borrado lógico /v1/admin/products/:id/restore
  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.productsService.restoreProduct(id);
  }

  // Activar / desactivar /v1/admin/products/:id/active
  @Patch(':id/active')
  setActive(@Param('id') id: string, @Body('active') active: boolean) {
    return this.productsService.setActive(id, active);
  }
}
