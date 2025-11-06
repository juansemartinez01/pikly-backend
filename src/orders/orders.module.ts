import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './controllers/orders.controller';
import { DeliveryController } from './controllers/delivery.controller';
import { OrdersService } from './services/orders.service';
import { DeliveryService } from './services/delivery.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { Customer } from './entities/customer.entity';
import { Address } from './entities/address.entity';
import { DeliverySlot } from './entities/delivery-slot.entity';
import { StockCurrent } from './entities/stock-current.entity';
import { StockReservation } from './entities/stock-reservation.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../catalog/entities/product.entity';
import { Combo } from '../catalog/entities/combo.entity';
import { PriceList } from '../catalog/entities/price-list.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderStatusHistory,
      Customer,
      Address,
      DeliverySlot,
      StockCurrent,
      StockReservation,
      Cart,
      CartItem,
      Product,
      Combo,
      PriceList,
    ]),
  ],
  controllers: [OrdersController, DeliveryController],
  providers: [OrdersService, DeliveryService],
  exports: [OrdersService, DeliveryService],
})
export class OrdersModule {}
