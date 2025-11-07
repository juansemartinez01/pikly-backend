import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { PriceList } from '../entities/price-list.entity';
import { Category } from '../entities/category.entity';
import { ProductQueryDto } from '../dto/product-query.dto';
import { normalizePageQuery } from '../../common/pagination';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductImage } from '../entities/product-image.entity';
import { CreateProductDto } from '../dto/create-product.dto';
import { slugify } from 'src/common/slug.util';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(ProductPrice) private priceRepo: Repository<ProductPrice>,
    @InjectRepository(PriceList) private plRepo: Repository<PriceList>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
    @InjectRepository(ProductImage) private imgRepo: Repository<ProductImage>,
    private ds: DataSource,
  ) {}

  // ---------- helpers ----------
  private async resolveCategory(dto: {
    categoryId?: string;
    categorySlug?: string;
  }) {
    if (dto.categoryId) {
      const c = await this.catRepo.findOne({ where: { id: dto.categoryId } });
      if (!c) throw new BadRequestException('Categoría no encontrada (id)');
      return c;
    }
    if (dto.categorySlug) {
      const c = await this.catRepo.findOne({
        where: { slug: dto.categorySlug },
      });
      if (!c) throw new BadRequestException('Categoría no encontrada (slug)');
      return c;
    }
    throw new BadRequestException('Debe indicar categoryId o categorySlug');
  }

  private async uniqueSlug(base: string, currentId?: string) {
    let s = slugify(base);
    if (!s) s = 'producto';
    let candidate = s;
    let i = 1;
    while (true) {
      const existing = await this.productRepo.findOne({
        where: currentId
          ? {
              slug: candidate,
              id:
                this.ds.driver.options.type === 'postgres'
                  ? (undefined as any)
                  : undefined,
            }
          : { slug: candidate },
        withDeleted: true,
      });
      if (!existing || (currentId && existing.id === currentId))
        return candidate;
      candidate = `${s}-${++i}`;
    }
  }

  private normalizeImages(images?: ProductImage[] | null) {
    if (!images || !images.length) return [];
    // asegurar orden consecutivo y número
    return images
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((img, idx) => {
        const i = this.imgRepo.create({
          id: img.id,
          url: img.url,
          alt: img.alt ?? null,
          order: img.order ?? idx,
        });
        return i;
      });
  }

  // ---------- ADMIN: list ----------
  async adminList(params: {
    q?: string;
    category?: string;
    includeDeleted?: boolean;
    active?: string;
    page: number;
    limit: number;
  }) {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.active === 'true') where.active = true;
    if (params.active === 'false') where.active = false;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoin('p.category', 'c')
      .select([
        'p.id AS id',
        'p.sku AS sku',
        'p.name AS name',
        'p.slug AS slug',
        'p.unit_type AS "unitType"',
        'p.step AS step',
        'p.min_qty AS "minQty"',
        'p.max_qty AS "maxQty"',
        'p.active AS active',
        'c.name AS "categoryName"',
        'c.slug AS "categorySlug"',
        'p.created_at AS "createdAt"',
        'p.updated_at AS "updatedAt"',
        'p.deleted_at AS "deletedAt"',
      ])
      .where('1=1');

    if (params.category)
      qb.andWhere('c.slug = :cslug', { cslug: params.category });
    if (params.q)
      qb.andWhere('(p.name ILIKE :q OR p.slug ILIKE :q OR p.sku ILIKE :q)', {
        q: `%${params.q}%`,
      });

    if (!params.includeDeleted) qb.andWhere('p.deleted_at IS NULL');

    const [rows, total] = await Promise.all([
      qb.orderBy('p.created_at', 'DESC').offset(skip).limit(limit).getRawMany(),
      qb.getCount(),
    ]);

    return { page, limit, total, items: rows };
  }

  async adminById(id: string) {
    const p = await this.productRepo.findOne({
      where: { id },
      relations: { images: true, category: true },
      withDeleted: true,
    });
    if (!p) throw new NotFoundException('Producto no encontrado');
    return p;
  }

  // ---------- ADMIN: create ----------
  async createProduct(dto: CreateProductDto) {
    return this.ds.transaction(async (m) => {
      const repo = m.getRepository(Product);
      const imgRepo = m.getRepository(ProductImage);

      // SKU único
      const skuTaken = await repo.findOne({
        where: { sku: dto.sku },
        withDeleted: true,
      });
      if (skuTaken) throw new BadRequestException('SKU ya existente');

      const category = await this.resolveCategory(dto);
      const slug = await this.uniqueSlug(dto.slug || dto.name);

      const product = repo.create({
        sku: dto.sku,
        name: dto.name,
        slug,
        description: dto.description ?? null,
        unitType: dto.unitType,
        step: dto.step,
        minQty: dto.minQty,
        maxQty: dto.maxQty,
        active: dto.active ?? true,
        badges: dto.badges ?? [],
        category,
        images: this.normalizeImages((dto.images as any) || []),
      });

      // Guardar (cascade en imágenes funciona, pero garantizamos repo explícito si hace falta)
      const saved = await repo.save(product);
      if (product.images?.length) {
        for (const im of product.images) {
          im.product = saved as any;
          await imgRepo.save(im);
        }
      }
      return this.adminById(saved.id);
    });
  }

  // ---------- ADMIN: update ----------
  async updateProduct(id: string, dto: UpdateProductDto) {
    return this.ds.transaction(async (m) => {
      const repo = m.getRepository(Product);
      const imgRepo = m.getRepository(ProductImage);

      const product = await repo.findOne({
        where: { id },
        relations: { images: true, category: true },
        withDeleted: true,
      });
      if (!product) throw new NotFoundException('Producto no encontrado');

      if (dto.sku && dto.sku !== product.sku) {
        const skuTaken = await repo.findOne({
          where: { sku: dto.sku },
          withDeleted: true,
        });
        if (skuTaken && skuTaken.id !== id) {
          throw new BadRequestException('SKU ya existente');
        }
        product.sku = dto.sku;
      }

      if (dto.name) product.name = dto.name;
      if (dto.description !== undefined)
        product.description = dto.description ?? null;
      if (dto.unitType) product.unitType = dto.unitType;
      if (dto.step !== undefined) product.step = dto.step;
      if (dto.minQty !== undefined) product.minQty = dto.minQty;
      if (dto.maxQty !== undefined) product.maxQty = dto.maxQty;
      if (dto.active !== undefined) product.active = dto.active;
      if (dto.badges !== undefined) product.badges = dto.badges ?? [];

      if (dto.categoryId || dto.categorySlug) {
        product.category = await this.resolveCategory(dto);
      }

      if (dto.slug !== undefined || dto.name) {
        const base = dto.slug ?? product.slug ?? product.name;
        product.slug = await this.uniqueSlug(base, id);
      }

      // Reemplazo total de imágenes si se envía "images"
      if (dto.images) {
        // borrar las existentes y volver a insertar según dto
        if (product.images?.length) {
          await imgRepo.delete({ product: { id: product.id } as any });
        }
        product.images = this.normalizeImages(dto.images as any);
      }

      await repo.save(product);
      return this.adminById(product.id);
    });
  }

  // ---------- ADMIN: soft delete / restore / active ----------
  async softDeleteProduct(id: string) {
    const exists = await this.productRepo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!exists) throw new NotFoundException('Producto no encontrado');
    await this.productRepo.softDelete({ id });
    return { ok: true, id };
  }

  async restoreProduct(id: string) {
    const exists = await this.productRepo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!exists) throw new NotFoundException('Producto no encontrado');
    await this.productRepo.restore({ id });
    return this.adminById(id);
  }

  async setActive(id: string, active: boolean) {
    const p = await this.productRepo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!p) throw new NotFoundException('Producto no encontrado');
    p.active = active;
    await this.productRepo.save(p);
    return this.adminById(id);
  }

  // ---------- PUBLIC: list / bySlug ----------
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
