import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Product } from '../catalog/entities/product.entity';
import { Category } from '../catalog/entities/category.entity';
import { ProductImage } from '../catalog/entities/product-image.entity';
import { PriceList } from '../catalog/entities/price-list.entity';
import { ProductPrice } from '../catalog/entities/product-price.entity';

import { ProductsAdminController } from '../catalog/controllers/products.admin.controller';
import { ProductsService } from '../catalog/services/products.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Category,
      ProductImage,
      PriceList,
      ProductPrice,
    ]),
  ],
  controllers: [ProductsAdminController],
  providers: [ProductsService],
})
export class AdminModule {}
