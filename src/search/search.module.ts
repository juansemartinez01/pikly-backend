import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Product } from '../catalog/entities/product.entity';
import { Combo } from '../catalog/entities/combo.entity';
import { Category } from '../catalog/entities/category.entity';
import { PriceList } from '../catalog/entities/price-list.entity';
import { ProductPrice } from '../catalog/entities/product-price.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Combo,
      Category,
      PriceList,
      ProductPrice,
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
