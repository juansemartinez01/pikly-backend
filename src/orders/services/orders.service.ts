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
import { PriceList } from 'src/catalog/entities/price-list.entity';
import { Product } from 'src/catalog/entities/product.entity';
import { Combo } from 'src/catalog/entities/combo.entity';

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
    // Ahora en realidad crea desde items directos, pero mantenemos el nombre
    return this.ds.transaction(async (m) => {
      // 1) Validar que haya items
      if (!dto.items || dto.items.length === 0) {
        throw new BadRequestException('Order must have at least one item');
      }

      // 2) Cliente simple (si vino email/phone)
      let customer: Customer | null = null;
      if (dto.customerEmail || dto.customerPhone) {
        customer = await m.getRepository(Customer).save({
          email: dto.customerEmail || null,
          phone: dto.customerPhone || null,
          firstName: dto.customerFirstName || null,
          lastName: dto.customerLastName || null,
        });
      }

      // 3) Dirección
      const address = await m.getRepository(Address).save({
        customer: customer || null,
        ...dto.address,
      });

      // 4) Slot de entrega (mantenemos lógica existente)
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

      // 5) Calcular subtotales desde items
      let subtotal = 0;
      for (const it of dto.items) {
        subtotal += Number(it.unitPrice) * Number(it.qty);
      }
      const discountTotal = 0; // Podés extender luego si querés manejar descuentos
      const shippingTotal = 0;
      const total = subtotal - discountTotal + shippingTotal;

      // (Opcional) si querés asociar una PriceList:
      let priceList: PriceList | null = null;
      // Si más adelante querés mandar priceListId en el DTO, acá lo podrías resolver.
      // Por ahora lo dejamos en null para no complicar.

      // 6) Crear la orden
      const order = m.getRepository(Order).create({
        orderNumber: this.genOrderNumber(),
        customer: customer || null,
        address,
        cartId: null, // ya no usamos carrito
        status: 'created',
        paymentStatus: dto.markAsPaid ? 'approved' : 'pending',
        priceList: priceList,
        currency: 'ARS', // podés parametrizarlo si querés
        subtotal,
        discountTotal,
        shippingTotal,
        total,
        deliveryDate: dto.deliveryDate,
        deliverySlot: slot || null,
        notes: dto.notes || null,
      });
      const saved = await m.getRepository(Order).save(order);

      // 7) Crear items de la orden (snapshot)
      for (const it of dto.items) {
        let product: Product | null = null;
        let combo: Combo | null = null;

        if (it.productId) {
          product = await m
            .getRepository(Product)
            .findOne({ where: { id: it.productId } });
          if (!product) {
            throw new BadRequestException(`Product not found: ${it.productId}`);
          }
        }

        if (it.comboId) {
          combo = await m
            .getRepository(Combo)
            .findOne({ where: { id: it.comboId } });
          if (!combo) {
            throw new BadRequestException(`Combo not found: ${it.comboId}`);
          }
        }

        const lineTotal = Number(it.unitPrice) * Number(it.qty);

        const nameSnapshot =
          product?.name || combo?.name || it.comment || 'Item';

        const skuSnapshot = product ? ((product as any).sku ?? null) : null;

        await m.getRepository(OrderItem).save({
          order: saved,
          product: product || null,
          combo: combo || null,
          nameSnapshot,
          skuSnapshot,
          unitType: product
            ? (product.unitType as any)
            : combo
              ? 'combo'
              : 'unit',
          qty: Number(it.qty),
          unitPrice: Number(it.unitPrice),
          compareAtPrice:
            it.compareAtPrice != null ? Number(it.compareAtPrice) : null,
          total: lineTotal,
        });
      }

      // 8) Reservas de stock (como antes, pero desde dto.items)
      for (const it of dto.items) {
        if (!it.productId) continue;

        const product = await m
          .getRepository(Product)
          .findOne({ where: { id: it.productId } });

        if (!product) continue;

        await m.getRepository(StockReservation).save({
          order: saved,
          product,
          qty: Number(it.qty),
        });
      }

      // 9) Marcar slot como tomado
      if (slot) await this.delivery.take(slot.id);

      // 10) Historia de estado
      await m.getRepository(OrderStatusHistory).save({
        order: saved,
        fromStatus: null,
        toStatus: 'created',
        note: 'Orden creada',
      });

        // 11) Si markAsPaid = true, pasamos a to_pick
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

  // ✅ IMPORTANTE: NO llamar a this.getByNumber dentro de la tx
  const out = await m.getRepository(Order).findOne({
    where: { id: saved.id },
    relations: {
      items: true,
      priceList: true,
      address: true,
      customer: true,
      deliverySlot: true,
    },
  });

  return out!;
});
  
    
  }
}
