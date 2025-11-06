import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { PriceList } from '../entities/price-list.entity';
import { Category } from '../entities/category.entity';
import { ProductQueryDto } from '../dto/product-query.dto';
import { normalizePageQuery } from '../../common/pagination';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(ProductPrice) private priceRepo: Repository<ProductPrice>,
    @InjectRepository(PriceList) private plRepo: Repository<PriceList>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
  ) {}

  async list(query: ProductQueryDto) {
    const { page, limit, skip } = normalizePageQuery(query);
    const q = (query.q || '').trim();
    const now = new Date();

    // Resuelve lista de precios (por nombre) o toma la de mayor prioridad activa
    let priceList = null as PriceList | null;
    if (query.priceList) {
      priceList = await this.plRepo.findOne({
        where: { name: query.priceList, active: true },
      });
    }
    if (!priceList) {
      priceList = await this.plRepo.findOne({
        where: { active: true },
        order: { priority: 'ASC' },
      });
    }

    // QueryBuilder con proyección mínima
    let qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoin('p.category', 'c')
      .leftJoin(
        ProductPrice,
        'pp',
        'pp.product_id = p.id AND pp.price_list_id = :plId AND (pp.valid_to IS NULL OR pp.valid_to >= :now) AND pp.valid_from <= :now',
        {
          plId: priceList?.id || null,
          now,
        },
      )
      .select([
        'p.id AS id',
        'p.sku AS sku',
        'p.name AS name',
        'p.slug AS slug',
        'p.unit_type AS "unitType"',
        'p.step AS step',
        'p.min_qty AS "minQty"',
        'p.max_qty AS "maxQty"',
        'p.badges AS badges',
        'c.slug AS "categorySlug"',
        'pp.price AS price',
        'pp.compare_at_price AS "compareAtPrice"',
      ])
      .where('p.active = true');

    if (query.category) {
      qb = qb.andWhere('c.slug = :cslug', { cslug: query.category });
    }
    if (q) {
      // usa idx trigram en name y también slug
      qb = qb.andWhere('(p.name ILIKE :q OR p.slug ILIKE :q)', { q: `%${q}%` });
    }
    if (query.badge) {
      qb = qb.andWhere(
        `EXISTS (SELECT 1 FROM jsonb_array_elements_text(p.badges) b WHERE b = :badge)`,
        { badge: query.badge },
      );
    }

    // Orden
    if (query.sort === 'price_asc')
      qb = qb.orderBy('"price"', 'ASC', 'NULLS LAST');
    else if (query.sort === 'price_desc')
      qb = qb.orderBy('"price"', 'DESC', 'NULLS LAST');
    else if (query.sort === 'name_desc') qb = qb.orderBy('p.name', 'DESC');
    else qb = qb.orderBy('p.name', 'ASC');

    const [rows, count] = await Promise.all([
      qb.offset(skip).limit(limit).getRawMany(),
      qb.getCount(), // estimado: cantidad sin paginación (conteo por misma where). getCount ignora select raw; OK.
    ]);

    return {
      page,
      limit,
      total: count,
      items: rows.map((r) => ({
        id: r.id,
        sku: r.sku,
        name: r.name,
        slug: r.slug,
        unitType: r.unitType,
        step: Number(r.step),
        minQty: Number(r.minQty),
        maxQty: Number(r.maxQty),
        categorySlug: r.categorySlug,
        price: r.price !== null ? Number(r.price) : null,
        compareAtPrice:
          r.compareAtPrice !== null ? Number(r.compareAtPrice) : null,
        badges: r.badges || [],
      })),
      priceList: priceList?.name || null,
    };
  }

  async bySlug(slug: string) {
    return this.productRepo.findOne({
      where: { slug, active: true },
      relations: { images: true, category: true },
      select: {
        id: true,
        sku: true,
        name: true,
        slug: true,
        description: true,
        unitType: true,
        step: true,
        minQty: true,
        maxQty: true,
        badges: true,
        images: { id: true, url: true, alt: true, order: true },
        category: { id: true, name: true, slug: true },
      },
    });
  }
}
