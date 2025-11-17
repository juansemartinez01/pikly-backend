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
      // -----------------------------
      // 1) Validar items (antes venían de Cart.items)
      // -----------------------------
      const items = dto.items || [];
      if (!items.length) {
        throw new BadRequestException('Carrito vacío');
      }

      // -----------------------------
      // 2) Cliente simple (si vino email/phone)
      // -----------------------------
      let customer: Customer | null = null;
      if (dto.customerEmail || dto.customerPhone) {
        customer = await m.getRepository(Customer).save({
          email: dto.customerEmail || null,
          phone: dto.customerPhone || null,
          firstName: dto.customerFirstName || null,
          lastName: dto.customerLastName || null,
        });
      }

      // -----------------------------
      // 3) Dirección
      // -----------------------------
      const address = await m.getRepository(Address).save({
        customer: customer || null,
        ...dto.address,
      });

      // -----------------------------
      // 4) Slot de entrega
      // -----------------------------
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

      // -----------------------------
      // 5) Totales (antes venían de cart.subtotal / cart.total)
      // -----------------------------
      const computedSubtotal = items.reduce(
        (acc, i) => acc + Number(i.total ?? i.unitPrice * i.qty),
        0,
      );

      const subtotal = dto.subtotal ?? computedSubtotal;
      const discountTotal = dto.discountTotal ?? 0;
      const shippingTotal = 0; // Regla de envío se suma luego si hace falta
      const total = dto.total ?? subtotal - discountTotal + shippingTotal;

      const currency = dto.currency ?? 'ARS';

      // -----------------------------
      // 6) Crear Order (sin depender del carrito en BD)
      // -----------------------------
      const order = m.getRepository(Order).create({
        orderNumber: this.genOrderNumber(),
        customer: customer || null,
        address,
        cartId: dto.cartId ?? null, // lo seguimos guardando como referencia externa
        status: 'created',
        paymentStatus: dto.markAsPaid ? 'approved' : 'pending',
        priceList: null, // si querés, después podemos agregar priceListId en el DTO
        currency,
        subtotal,
        discountTotal,
        shippingTotal,
        total,
        deliveryDate: dto.deliveryDate,
        deliverySlot: slot || null,
        notes: dto.notes || null,
      });

      const saved = await m.getRepository(Order).save(order);

      // -----------------------------
      // 7) Items (snapshot que antes venía del CartItem)
      // -----------------------------
      for (const ci of items) {
        await m.getRepository(OrderItem).save({
          order: saved,
          // de momento no linkeamos Product/Combo, solo snapshot
          product: null,
          combo: null,
          nameSnapshot: ci.name,
          skuSnapshot: ci.sku ?? null,
          unitType: ci.unitType as any,
          qty: Number(ci.qty),
          unitPrice: Number(ci.unitPrice),
          compareAtPrice:
            ci.compareAtPrice != null ? Number(ci.compareAtPrice) : null,
          total: Number(ci.total),
        });
      }

      // -----------------------------
      // 8) Reservas de stock
      // -----------------------------
      // Antes: se basaba en Cart.items.product (entidad completa).
      // Ahora solo tenemos IDs en el DTO. Si querés seguir reservando stock,
      // en otra iteración agregamos acá la carga de Product por id y las reservas.
      //
      // Por ahora lo dejamos desactivado para no complicar este cambio:
      //
      // for (const ci of items.filter((i) => i.productId)) {
      //   const product = await m.getRepository(Product).findOne({ where: { id: ci.productId } });
      //   if (!product) continue;
      //   await m.getRepository(StockReservation).save({
      //     order: saved,
      //     product,
      //     qty: Number(ci.qty),
      //   });
      // }

      // -----------------------------
      // 9) Marcar slot como tomado
      // -----------------------------
      if (slot) await this.delivery.take(slot.id);

      // -----------------------------
      // 10) Historia de estado
      // -----------------------------
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

      // Ya no limpiamos carrito porque no lo tenemos en BD
      // (el front maneja el carrito)

      return this.getByNumber(saved.orderNumber);
    });
  }
}
