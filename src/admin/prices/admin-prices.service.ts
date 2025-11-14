import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PriceList } from '../../catalog/entities/price-list.entity';
import { ProductPrice } from '../../catalog/entities/product-price.entity';
import { Product } from '../../catalog/entities/product.entity';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { UpsertProductPriceDto } from './dto/upsert-product-price.dto';
import { BulkUpsertProductPriceDto } from '../prices/dto/bulk-upsert-product-price.dto';

@Injectable()
export class AdminPricesService {
  constructor(
    @InjectRepository(PriceList)
    private readonly plRepo: Repository<PriceList>,
    @InjectRepository(ProductPrice)
    private readonly priceRepo: Repository<ProductPrice>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  // ---------- PRICE LISTS ----------

  async listPriceLists() {
    return this.plRepo.find({
      order: { priority: 'ASC', name: 'ASC' },
    });
  }

  async createPriceList(dto: CreatePriceListDto) {
    const exists = await this.plRepo.findOne({ where: { name: dto.name } });
    if (exists) throw new BadRequestException('Price list name already exists');
    const pl = this.plRepo.create({
      name: dto.name,
      priority: dto.priority ?? 100,
      active: dto.active ?? true,
    });
    return this.plRepo.save(pl);
  }

  async updatePriceList(id: string, dto: UpdatePriceListDto) {
    const pl = await this.plRepo.findOne({ where: { id } });
    if (!pl) throw new NotFoundException('Price list not found');

    if (dto.name && dto.name !== pl.name) {
      const dup = await this.plRepo.findOne({
        where: { name: dto.name },
      });
      if (dup && dup.id !== pl.id) {
        throw new BadRequestException(
          'Another price list with that name already exists',
        );
      }
    }

    Object.assign(pl, dto);
    return this.plRepo.save(pl);
  }

  async deletePriceList(id: string) {
    const pl = await this.plRepo.findOne({ where: { id } });
    if (!pl) throw new NotFoundException('Price list not found');

    // estrategia: soft delete vía active=false
    pl.active = false;
    return this.plRepo.save(pl);
  }

  // ---------- PRODUCT PRICES ----------

  private async resolveProduct(dto: UpsertProductPriceDto): Promise<Product> {
    if (dto.productId) {
      const p = await this.productRepo.findOne({
        where: { id: dto.productId },
      });
      if (!p) throw new NotFoundException('Product not found (by id)');
      return p;
    }
    if (dto.productSku) {
      const p = await this.productRepo.findOne({
        where: { sku: dto.productSku },
      });
      if (!p) throw new NotFoundException('Product not found (by sku)');
      return p;
    }
    throw new BadRequestException('productId or productSku is required');
  }

  private async resolvePriceListForPrice(
    dto: UpsertProductPriceDto,
  ): Promise<PriceList> {
    if (dto.priceListId) {
      const pl = await this.plRepo.findOne({ where: { id: dto.priceListId } });
      if (!pl) throw new NotFoundException('Price list not found (by id)');
      return pl;
    }
    if (dto.priceListName) {
      const pl = await this.plRepo.findOne({
        where: { name: dto.priceListName },
      });
      if (!pl) throw new NotFoundException('Price list not found (by name)');
      return pl;
    }
    // default: price list activa de mayor prioridad
    const pl = await this.plRepo.findOne({
      where: { active: true },
      order: { priority: 'ASC' },
    });
    if (!pl) throw new BadRequestException('No active price list found');
    return pl;
  }

  /**
   * Crea o agrega un nuevo precio "vigente desde" para un producto/lista.
   * Por simplicidad: si replaceActive=true, cierra el precio anterior (valid_to = validFrom).
   */
  async upsertProductPrice(dto: UpsertProductPriceDto) {
    const product = await this.resolveProduct(dto);
    const priceList = await this.resolvePriceListForPrice(dto);

    const validFrom = dto.validFrom ? new Date(dto.validFrom) : new Date();
    const validTo = dto.validTo ? new Date(dto.validTo) : null;

    if (validTo && validTo <= validFrom) {
      throw new BadRequestException('validTo must be greater than validFrom');
    }

    return this.dataSource.transaction(async (manager) => {
      if (dto.replaceActive !== false) {
        // Cerramos precios vigentes solapados
        await manager
          .createQueryBuilder()
          .update(ProductPrice)
          .set({ validTo: validFrom })
          .where('product_id = :pid', { pid: product.id })
          .andWhere('price_list_id = :plid', { plid: priceList.id })
          .andWhere('valid_to IS NULL OR valid_to > :from', { from: validFrom })
          .execute();
      }

      const pp = manager.create(ProductPrice, {
        product,
        priceList,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice ?? null,
        validFrom,
        validTo,
      });

      return manager.save(pp);
    });
  }

  async bulkUpsertProductPrices(body: BulkUpsertProductPriceDto) {
    const results: ProductPrice[] = [];
    for (const item of body.items) {
      // eslint-disable-next-line no-await-in-loop
      const r = await this.upsertProductPrice(item);
      results.push(r);
    }
    return { count: results.length, items: results };
  }

  async listPricesForProduct(productId: string) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const prices = await this.priceRepo.find({
      where: { product: { id: product.id } },
      relations: ['priceList'],
      order: { validFrom: 'DESC' },
    });

    return {
      product: { id: product.id, sku: product.sku, name: product.name },
      prices: prices.map((p) => ({
        id: p.id,
        priceList: {
          id: p.priceList.id,
          name: p.priceList.name,
        },
        price: Number(p.price),
        compareAtPrice:
          p.compareAtPrice != null ? Number(p.compareAtPrice) : null,
        validFrom: p.validFrom,
        validTo: p.validTo,
      })),
    };
  }

  // ---------- LISTAR PRODUCTOS + PRECIOS DE UNA LISTA ----------

  async listProductsForPriceList(priceListId: string) {
    const pl = await this.plRepo.findOne({ where: { id: priceListId } });
    if (!pl) throw new NotFoundException('Price list not found');

    const now = new Date();

    const rows = await this.priceRepo
      .createQueryBuilder('pp')
      .innerJoin('pp.product', 'p')
      .innerJoin('pp.priceList', 'pl')
      .select([
        'p.id AS "productId"',
        'p.sku AS sku',
        'p.name AS name',
        'pp.id AS "priceId"',
        'pp.price AS price',
        'pp.compareAtPrice AS "compareAtPrice"',
        'pp.validFrom AS "validFrom"',
        'pp.validTo AS "validTo"',
      ])
      .where('pl.id = :plId', { plId: pl.id })
      // solo precios vigentes en este momento
      .andWhere('(pp.validTo IS NULL OR pp.validTo >= :now)', { now })
      .andWhere('pp.validFrom <= :now', { now })
      .orderBy('p.name', 'ASC')
      .getRawMany();

    return {
      priceList: {
        id: pl.id,
        name: pl.name,
        priority: pl.priority,
        active: pl.active,
      },
      items: rows.map((r) => ({
        productId: r.productId,
        sku: r.sku,
        name: r.name,
        priceId: r.priceId,
        price: Number(r.price),
        compareAtPrice:
          r.compareAtPrice != null ? Number(r.compareAtPrice) : null,
        validFrom: r.validFrom,
        validTo: r.validTo,
      })),
    };
  }
}
