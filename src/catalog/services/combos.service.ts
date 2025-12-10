import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Combo } from '../entities/combo.entity';
import { ComboItem } from '../entities/combo-item.entity';
import { Product } from '../entities/product.entity';
import { CreateComboDto } from '../dto/create-combo.dto';
import { UpdateComboDto } from '../dto/update-combo.dto';
import { slugify } from 'src/common/slug.util';
import { ProductPrice } from 'src/catalog/entities/product-price.entity';
import { PriceList } from 'src/catalog/entities/price-list.entity';

@Injectable()
export class CombosService {
  constructor(
    @InjectRepository(Combo) private repo: Repository<Combo>,
    @InjectRepository(ComboItem) private itemRepo: Repository<ComboItem>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(PriceList) private priceListRepo: Repository<PriceList>,
    @InjectRepository(ProductPrice) private priceRepo: Repository<ProductPrice>,
    private ds: DataSource,
  ) {}

  // ---------- UTIL ----------
  private async uniqueSlug(base: string, currentId?: string) {
    let s = slugify(base);
    let candidate = s;
    let i = 1;

    while (true) {
      const exists = await this.repo.findOne({
        where: { slug: candidate },
        withDeleted: true,
      });
      if (!exists || exists.id === currentId) return candidate;
      candidate = `${s}-${++i}`;
    }
  }

  // ---------- ADMIN LIST ----------
  async adminList() {
    return this.repo.find({
      relations: { items: { product: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async adminById(id: string) {
    const combo = await this.repo.findOne({
      where: { id },
      relations: { items: { product: true } },
      withDeleted: true,
    });
    if (!combo) throw new NotFoundException('Combo no encontrado');
    return combo;
  }

  // ---------- CREATE ----------
  async create(dto: CreateComboDto) {
    return this.ds.transaction(async (m) => {
      const comboRepo = m.getRepository(Combo);
      const itemRepo = m.getRepository(ComboItem);

      // Slug único
      const slug = await this.uniqueSlug(dto.slug ?? dto.name);

      const combo = comboRepo.create({
        name: dto.name,
        slug,
        description: dto.description ?? null,
        price: dto.price,
        currency: 'ARS',
        badges: dto.badges ?? [],
        imageUrl: dto.imageUrl ?? null,
      });

      const saved = await comboRepo.save(combo);

      // Guardar items
      for (const i of dto.items) {
        const product = await this.productRepo.findOne({
          where: { id: i.productId },
        });
        if (!product) throw new BadRequestException('Producto inválido');

        const item = itemRepo.create({
          combo: saved,
          product,
          qty: i.qty,
          unitType: i.unitType,
        });

        await itemRepo.save(item);
      }

      return comboRepo.findOne({
        where: { id: saved.id },
        relations: { items: { product: true } },
      });
    });
  }

  // ---------- UPDATE ----------
  async update(id: string, dto: UpdateComboDto) {
    return this.ds.transaction(async (m) => {
      const comboRepo = m.getRepository(Combo);
      const itemRepo = m.getRepository(ComboItem);

      const combo = await comboRepo.findOne({
        where: { id },
        relations: { items: true },
      });
      if (!combo) throw new NotFoundException('Combo no encontrado');

      if (dto.name) combo.name = dto.name;
      if (dto.description !== undefined)
        combo.description = dto.description ?? null;
      if (dto.price !== undefined) combo.price = dto.price;
      if (dto.badges !== undefined) combo.badges = dto.badges ?? [];
      if (dto.imageUrl !== undefined) combo.imageUrl = dto.imageUrl;

      if (dto.slug || dto.name) {
        const base = dto.slug ?? combo.slug ?? combo.name;
        combo.slug = await this.uniqueSlug(base, id);
      }

      // ------ FIX: Reemplazo total de items ------
      if (dto.items) {
        // borrar items existentes correctamente
        await itemRepo
          .createQueryBuilder()
          .delete()
          .from(ComboItem)
          .where('combo_id = :id', { id })
          .execute();


        // insertar los nuevos
        for (const i of dto.items) {
          const product = await this.productRepo.findOne({
            where: { id: i.productId },
          });
          if (!product) throw new BadRequestException('Producto inválido');

          const item = itemRepo.create({
            combo: combo,
            product,
            qty: i.qty,
            unitType: i.unitType,
          });

          await itemRepo.save(item);
        }
      }

      await comboRepo.save(combo);
      return comboRepo.findOne({
        where: { id },
        relations: { items: { product: true } },
      });

    });
  }

  // ---------- SOFT DELETE ----------
  async softDelete(id: string) {
    const combo = await this.repo.findOne({ where: { id } });
    if (!combo) throw new NotFoundException('Combo no encontrado');

    combo.active = false;
    await this.repo.save(combo);

    return { ok: true };
  }

  async setActive(id: string, active: boolean) {
    const combo = await this.repo.findOne({ where: { id } });
    if (!combo) throw new NotFoundException('Combo no encontrado');

    combo.active = active;
    await this.repo.save(combo);

    return this.adminById(id);
  }

  // ---------- PUBLIC LIST ----------
  async list(priceListName?: string) {
    let priceList: PriceList | null = null;

    if (priceListName) {
      priceList = await this.priceListRepo.findOne({
        where: { name: priceListName, active: true },
      });
    }

    if (!priceList) {
      priceList = await this.priceListRepo.findOne({
        where: { active: true },
        order: { priority: 'ASC' },
      });
    }

    const combos = await this.repo.find({
      where: { active: true },
      relations: { items: { product: true } },
      order: { name: 'ASC' },
    });

    // Enriquecer precios dinámicos
    for (const c of combos) {
      for (const item of c.items) {
        let pp: ProductPrice | null = null;
        if (priceList) {
          pp = await this.priceRepo.findOne({
            where: {
              product: { id: item.product.id },
              priceList: { id: priceList.id },
            },
            order: { validFrom: 'DESC' },
          });
        }

        item.product['price'] = pp?.price ?? null;
        item.product['compareAtPrice'] = pp?.compareAtPrice ?? null;
      }
    }

    return combos;
  }
}
