import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Cart } from '../entities/cart.entity';
import { CartItem } from '../entities/cart-item.entity';
import { PriceList } from '../../catalog/entities/price-list.entity';
import { Product } from '../../catalog/entities/product.entity';
import { ProductPrice } from '../../catalog/entities/product-price.entity';
import { Combo } from '../../catalog/entities/combo.entity';
import { Category } from '../../catalog/entities/category.entity';
import { CreateCartDto } from '../dto/create-cart.dto';
import { AddItemDto } from '../dto/add-item.dto';
import { UpdateItemDto } from '../dto/update-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private itemRepo: Repository<CartItem>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(ProductPrice) private priceRepo: Repository<ProductPrice>,
    @InjectRepository(PriceList) private plRepo: Repository<PriceList>,
    @InjectRepository(Combo) private comboRepo: Repository<Combo>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
    private ds: DataSource,
  ) {}

  private async resolvePriceList(
    name?: string | null,
  ): Promise<PriceList | null> {
    if (name) {
      const byName = await this.plRepo.findOne({
        where: { name, active: true },
      });
      if (byName) return byName;
    }
    return this.plRepo.findOne({
      where: { active: true },
      order: { priority: 'ASC' },
    });
  }

  async createCart(dto: CreateCartDto) {
    const pl = await this.resolvePriceList(dto.priceList || null);
    const cart = this.cartRepo.create({
      sessionId: dto.sessionId || null,
      priceList: pl || null,
      currency: pl?.currency || 'ARS',
      subtotal: 0,
      discountTotal: 0,
      total: 0,
    });
    const saved = await this.cartRepo.save(cart);
    return this.findById(saved.id);
  }

  async findById(id: string) {
    const cart = await this.cartRepo.findOne({
      where: { id },
      relations: { priceList: true, items: { product: true, combo: true } },
      select: {
        id: true,
        currency: true,
        subtotal: true,
        discountTotal: true,
        total: true,
        priceList: { id: true, name: true, currency: true, priority: true },
        items: {
          id: true,
          qty: true,
          unitType: true,
          unitPrice: true,
          compareAtPrice: true,
          total: true,
          product: { id: true, name: true, slug: true, unitType: true },
          combo: { id: true, name: true, slug: true, price: true },
        },
      },
    });
    if (!cart) throw new NotFoundException('Carrito no encontrado');
    return cart;
  }

  private assertQtyAgainstProduct(product: Product, qty: number) {
    const step = Number(product.step || 1);
    const min = Number(product.minQty || 1);
    const max = Number(product.maxQty || 999999);
    if (qty < min) throw new BadRequestException(`Cantidad mínima: ${min}`);
    if (qty > max) throw new BadRequestException(`Cantidad máxima: ${max}`);
    const multiple = Math.round((qty / step) * 1000) / 1000;
    if (Math.abs(multiple - Math.round(multiple)) > 1e-6) {
      throw new BadRequestException(
        `La cantidad debe ser múltiplo del step ${step}`,
      );
    }
  }

  private async currentProductPrice(
    productId: string,
    priceListId: string | null,
  ) {
    const now = new Date();
    return this.priceRepo
      .createQueryBuilder('pp')
      .where('pp.product_id = :pid', { pid: productId })
      .andWhere(priceListId ? 'pp.price_list_id = :pl' : '1=1', {
        pl: priceListId || undefined,
      })
      .andWhere(
        '(pp.valid_to IS NULL OR pp.valid_to >= :now) AND pp.valid_from <= :now',
        { now },
      )
      .orderBy('pp.price_list_id = :pl DESC', 'DESC') // si hay varias, prioriza la pl exacta
      .addOrderBy('pp.created_at', 'DESC')
      .setParameters({ pl: priceListId })
      .getOne();
  }

  private recalcTotals(cartId: string) {
    return this.ds.transaction(async (m) => {
      const items = await m.getRepository(CartItem).find({
        where: { cart: { id: cartId } },
        select: ['unitPrice', 'compareAtPrice', 'qty', 'total'],
      });
      const subtotal = items.reduce((s, i) => s + Number(i.total), 0);
      const discount = items.reduce((s, i) => {
        const cmp = i.compareAtPrice != null ? Number(i.compareAtPrice) : 0;
        const diff = Math.max(0, cmp - Number(i.unitPrice));
        return s + diff * Number(i.qty);
      }, 0);
      const total = subtotal; // por ahora envío/impuestos se agregan en checkout
      await m.getRepository(Cart).update(
        { id: cartId },
        {
          subtotal: Number(subtotal.toFixed(2)),
          discountTotal: Number(discount.toFixed(2)),
          total: Number(total.toFixed(2)),
        },
      );
    });
  }

  async addItem(dto: AddItemDto) {
    return this.ds.transaction(async (m) => {
      const cart = await m.getRepository(Cart).findOne({
        where: { id: dto.cartId },
        relations: { priceList: true },
      });
      if (!cart) throw new NotFoundException('Carrito no encontrado');

      if (!!dto.productId === !!dto.comboId) {
        throw new BadRequestException(
          'Debes enviar productId O comboId, no ambos.',
        );
      }

      let unitPrice = 0,
        compareAt: number | null = null,
        unitType: CartItem['unitType'];
      let meta: Record<string, any> | undefined;
      let product: Product | null = null;
      let combo: Combo | null = null;

      if (dto.productId) {
        product = await m.getRepository(Product).findOne({
          where: { id: dto.productId, active: true },
          relations: { category: true },
        });
        if (!product)
          throw new NotFoundException('Producto no encontrado o inactivo');

        const cat = await m
          .getRepository(Category)
          .findOne({ where: { id: product.category.id, active: true } });
        if (!cat) throw new BadRequestException('Categoría inactiva');

        this.assertQtyAgainstProduct(product, dto.qty);

        const price = await this.currentProductPrice(
          product.id,
          cart.priceList?.id || null,
        );
        if (!price)
          throw new BadRequestException('Producto sin precio vigente');
        unitPrice = Number(price.price);
        compareAt =
          price.compareAtPrice != null ? Number(price.compareAtPrice) : null;
        unitType = dto.unitType || (product.unitType as any);
        meta = { name: product.name, sku: product.sku };
      } else {
        combo = await m
          .getRepository(Combo)
          .findOne({ where: { id: dto.comboId!, active: true } });
        if (!combo)
          throw new NotFoundException('Combo no encontrado o inactivo');
        if (dto.qty < 1)
          throw new BadRequestException('Cantidad mínima de combo: 1');

        unitPrice = Number(combo.price);
        compareAt = null;
        unitType = 'combo';
        meta = { name: combo.name };
      }

      const total = Number((unitPrice * dto.qty).toFixed(2));

      const item = m.getRepository(CartItem).create({
        cart,
        product: product || null,
        combo: combo || null,
        qty: dto.qty,
        unitType,
        unitPrice: Number(unitPrice.toFixed(2)),
        compareAtPrice: compareAt != null ? Number(compareAt.toFixed(2)) : null,
        total,
        meta,
      });
      const saved = await m.getRepository(CartItem).save(item);

      await this.recalcTotals(cart.id);
      return this.findById(cart.id);
    });
  }

  async updateItem(itemId: string, dto: UpdateItemDto) {
    return this.ds.transaction(async (m) => {
      const item = await m.getRepository(CartItem).findOne({
        where: { id: itemId },
        relations: { cart: { priceList: true }, product: true, combo: true },
      });
      if (!item) throw new NotFoundException('Item no encontrado');

      if (item.product) {
        this.assertQtyAgainstProduct(item.product, dto.qty);
      } else {
        if (dto.qty < 1)
          throw new BadRequestException('Cantidad mínima de combo: 1');
      }

      item.qty = dto.qty;
      item.total = Number((Number(item.unitPrice) * dto.qty).toFixed(2));
      await m.getRepository(CartItem).save(item as any); // typo guard
      // ↑ lo corregimos abajo, ver nota
      return this.finalizeUpdate(item, m);
    });
  }

  private async finalizeUpdate(item: CartItem, m: any) {
    await this.recalcTotals(item.cart.id);
    return this.findById(item.cart.id);
  }

  async removeItem(itemId: string) {
    return this.ds.transaction(async (m) => {
      const item = await m.getRepository(CartItem).findOne({
        where: { id: itemId },
        relations: { cart: true },
      });
      if (!item) throw new NotFoundException('Item no encontrado');
      await m.getRepository(CartItem).delete({ id: itemId });
      await this.recalcTotals(item.cart.id);
      return this.findById(item.cart.id);
    });
  }
}
