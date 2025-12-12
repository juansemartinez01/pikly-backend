import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { PriceList } from './entities/price-list.entity';
import { ProductPrice } from './entities/product-price.entity';
import { Combo } from './entities/combo.entity';
import { ComboItem } from './entities/combo-item.entity';
import { CategoriesController } from './controllers/categories.controller';
import { ProductsController } from './controllers/products.controller';
import { CombosController } from './controllers/combos.controller';
import { CategoriesService } from './services/categories.service';
import { ProductsService } from './services/products.service';
import { CombosService } from './services/combos.service';
import { AdminCombosController } from './controllers/adminCombos.controller';
import { OpsModule } from 'src/ops/ops.module';
import { OpsService } from 'src/ops/services/ops.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      Product,
      ProductImage,
      PriceList,
      ProductPrice,
      Combo,
      ComboItem,
    ]),
  ],
  controllers: [CategoriesController, ProductsController, CombosController,AdminCombosController],
  providers: [CategoriesService, ProductsService, CombosService,OpsService],
  exports: [ProductsService],
})
export class CatalogModule {}
