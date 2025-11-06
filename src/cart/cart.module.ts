import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { CartService } from './services/cart.service';
import { CartController } from './controllers/cart.controller';
import { Product } from '../catalog/entities/product.entity';
import { ProductPrice } from '../catalog/entities/product-price.entity';
import { PriceList } from '../catalog/entities/price-list.entity';
import { Combo } from '../catalog/entities/combo.entity';
import { Category } from '../catalog/entities/category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cart,
      CartItem,
      Product,
      ProductPrice,
      PriceList,
      Combo,
      Category,
    ]),
  ],
  providers: [CartService],
  controllers: [CartController],
  exports: [CartService],
})
export class CartModule {}
