import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderStatusHistory } from '../entities/order-status-history.entity';
import { Customer } from '../entities/customer.entity';
import { Address } from '../entities/address.entity';
import { DeliverySlot } from '../entities/delivery-slot.entity';
import { StockReservation } from '../entities/stock-reservation.entity';
import { Cart } from '../../cart/entities/cart.entity';
import { CartItem } from '../../cart/entities/cart-item.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { DeliveryService } from './delivery.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
    @InjectRepository(OrderStatusHistory)
    private histRepo: Repository<OrderStatusHistory>,
    @InjectRepository(Customer) private custRepo: Repository<Customer>,
    @InjectRepository(Address) private addrRepo: Repository<Address>,
    @InjectRepository(DeliverySlot) private slotRepo: Repository<DeliverySlot>,
    @InjectRepository(StockReservation)
    private resRepo: Repository<StockReservation>,
    @InjectRepository(Cart) private cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private cartItemRepo: Repository<CartItem>,
    private ds: DataSource,
    private delivery: DeliveryService,
  ) {}

  private genOrderNumber() {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rnd = Math.floor(Math.random() * 9000) + 1000;
    return `PO-${ymd}-${rnd}`;
  }

  async getByNumber(orderNumber: string) {
    const order = await this.orderRepo.findOne({
      where: { orderNumber },
      relations: {
        items: true,
        priceList: true,
        address: true,
        customer: true,
        deliverySlot: true,
      },
    });
    if (!order) throw new NotFoundException('Orden no encontrada');
    return order;
  }

  async createFromCart(dto: CreateOrderDto) {
    return this.ds.transaction(async (m) => {
      const cart = await m.getRepository(Cart).findOne({
        where: { id: dto.cartId },
        relations: { items: { product: true, combo: true }, priceList: true },
      });
      if (!cart) throw new NotFoundException('Carrito no encontrado');
      if (!cart.items || cart.items.length === 0)
        throw new BadRequestException('Carrito vacío');

      // Cliente simple (si vino email/phone)
      let customer: Customer | null = null;
      if (dto.customerEmail || dto.customerPhone) {
        customer = await m.getRepository(Customer).save({
          email: dto.customerEmail || null,
          phone: dto.customerPhone || null,
          firstName: dto.customerFirstName || null,
          lastName: dto.customerLastName || null,
        });
      }

      // Dirección
      const address = await m.getRepository(Address).save({
        customer: customer || null,
        ...dto.address,
      });

      // Slot
      let slot: DeliverySlot | null = null;
      if (dto.deliverySlotId) {
        slot = await m
          .getRepository(DeliverySlot)
          .findOne({ where: { id: dto.deliverySlotId } });
        if (!slot) throw new BadRequestException('Franja horaria inválida');
      } else {
        await this.delivery.ensureSlotsFor(dto.deliveryDate);
        const slots = await this.delivery.list(dto.deliveryDate);
        slot = slots[0] || null;
      }

      const order = m.getRepository(Order).create({
        orderNumber: this.genOrderNumber(),
        customer: customer || null,
        address,
        cartId: cart.id,
        status: 'created',
        paymentStatus: dto.markAsPaid ? 'approved' : 'pending',
        priceList: cart.priceList || null,
        currency: cart.currency,
        subtotal: Number(cart.subtotal),
        discountTotal: Number(cart.discountTotal),
        shippingTotal: 0, // regla de envío se suma luego
        total: Number(cart.total),
        deliveryDate: dto.deliveryDate,
        deliverySlot: slot || null,
        notes: dto.notes || null,
      });
      const saved = await m.getRepository(Order).save(order);

      // Items (snapshot)
      for (const ci of cart.items) {
        await m.getRepository(OrderItem).save({
          order: saved,
          product: ci.product || null,
          combo: ci.combo || null,
          nameSnapshot: ci.product ? ci.product.name : ci.combo?.name || '',
          skuSnapshot: ci.product ? (ci.product as any).sku : null,
          unitType: ci.unitType as any,
          qty: Number(ci.qty),
          unitPrice: Number(ci.unitPrice),
          compareAtPrice:
            ci.compareAtPrice != null ? Number(ci.compareAtPrice) : null,
          total: Number(ci.total),
        });
      }

      // Reservas de stock (solo productos)
      for (const ci of cart.items.filter((i) => !!i.product)) {
        await m.getRepository(StockReservation).save({
          order: saved,
          product: ci.product!,
          qty: Number(ci.qty),
        });
      }

      // Marcar slot como tomado
      if (slot) await this.delivery.take(slot.id);

      // Historia de estado
      await m.getRepository(OrderStatusHistory).save({
        order: saved,
        fromStatus: null,
        toStatus: 'created',
        note: 'Orden creada',
      });

      // (Opcional) si nos pidieron marcar como pago
      if (dto.markAsPaid) {
        saved.status = 'to_pick';
        await m.getRepository(Order).save(saved);
        await m.getRepository(OrderStatusHistory).save({
          order: saved,
          fromStatus: 'created',
          toStatus: 'to_pick',
          note: 'Pago acreditado (flag markAsPaid)',
        });
      }

      // Limpio el carrito (opcional: lo dejamos para que el cliente lo pueda reabrir)
      // await m.getRepository(CartItem).delete({ cart: { id: cart.id } });

      return this.getByNumber(saved.orderNumber);
    });
  }
}
