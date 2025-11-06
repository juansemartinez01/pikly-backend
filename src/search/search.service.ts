import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../catalog/entities/product.entity';
import { Combo } from '../catalog/entities/combo.entity';
import { PriceList } from '../catalog/entities/price-list.entity';
import { ProductPrice } from '../catalog/entities/product-price.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Combo) private comboRepo: Repository<Combo>,
    @InjectRepository(PriceList) private plRepo: Repository<PriceList>,
    @InjectRepository(ProductPrice) private priceRepo: Repository<ProductPrice>,
  ) {}

  private async resolvePriceList(name?: string | null) {
    if (name) {
      const byName = await this.plRepo.findOne({ where: { name, active: true } });
      if (byName) return byName;
    }
    return this.plRepo.findOne({ where: { active: true }, order: { priority: 'ASC' } });
  }

  async search(q: string, priceListName?: string | null, limit = 20) {
    const pl = await this.resolvePriceList(priceListName || null);
    const now = new Date();
    const like = `%${q}%`;

    // Productos
    const pQ = this.productRepo.createQueryBuilder('p')
      .leftJoin('p.category', 'c')
      .leftJoin(ProductPrice, 'pp', 'pp.product_id = p.id AND pp.price_list_id = :plId AND (pp.valid_to IS NULL OR pp.valid_to >= :now) AND pp.valid_from <= :now', { plId: pl?.id || null, now })
      .select([
        `'product' AS kind`,
        'p.id AS id',
        'p.name AS name',
        'p.slug AS slug',
        'c.slug AS "categorySlug"',
        'pp.price AS price',
        'pp.compare_at_price AS "compareAtPrice"',
      ])
      .where('p.active = true')
      .andWhere('(p.name ILIKE :like OR p.slug ILIKE :like)', { like })
      .limit(limit);

    // Combos
    const cQ = this.comboRepo
      .createQueryBuilder('co')
      .select([
        `'combo' AS kind`,
        'co.id AS id',
        'co.name AS name',
        'co.slug AS slug',
        `'combos' AS "categorySlug"`,
        'co.price AS price',
        'NULL::numeric AS "compareAtPrice"',
      ])
      .where('co.active = true')
      .andWhere('(co.name ILIKE :like OR co.slug ILIKE :like)', { like })
      .limit(limit);

    const [products, combos] = await Promise.all([pQ.getRawMany(), cQ.getRawMany()]);
    const items = [...products, ...combos].slice(0, limit);

    return { q, priceList: pl?.name || null, items };
  }
}
