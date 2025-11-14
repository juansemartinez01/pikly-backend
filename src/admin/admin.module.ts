import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Product } from '../catalog/entities/product.entity';
import { Category } from '../catalog/entities/category.entity';
import { ProductImage } from '../catalog/entities/product-image.entity';
import { PriceList } from '../catalog/entities/price-list.entity';
import { ProductPrice } from '../catalog/entities/product-price.entity';

import { AdminProductsController } from './products/products.admin.controller';
import { ProductsService } from '../catalog/services/products.service';
import { AdminPricesController } from 'src/admin/prices/admin-prices.controller';
import { Admin } from 'typeorm';
import { AdminPricesService } from 'src/admin/prices/admin-prices.service';
import { AdminGuard } from 'src/admin/auth/admin.guard';
import { AdminCategoriesController } from './products/admin-categories.controller';
import { AdminCategoriesService } from './products/admin-categories.service';

import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Category,
      ProductImage,
      PriceList,
      ProductPrice,
      PriceList,
    ]),
    CatalogModule,
  ],
  controllers: [
    AdminProductsController,
    AdminPricesController,
    AdminCategoriesController,
    AdminPricesController,
  ],
  providers: [
    ProductsService,
    AdminPricesService,
    
    AdminCategoriesService,
    AdminGuard,
  ],
})
export class AdminModule {}
