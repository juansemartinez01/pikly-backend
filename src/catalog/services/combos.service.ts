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
import { PriceList } from 'src/catalog/entities/price-list.entity';
import { ProductPrice } from 'src/catalog/entities/product-price.entity';

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
      relations: { items: { product: true }, priceLists: true },
      order: { createdAt: 'DESC' },
    });
  }

  async adminById(id: string) {
    const combo = await this.repo.findOne({
      where: { id },
      relations: { items: { product: true }, priceLists: true },
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

      // ------- Items -------
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

      // ------- PriceLists -------
      if (dto.priceListIds?.length) {
        saved.priceLists = await this.priceListRepo.findByIds(dto.priceListIds);
        await comboRepo.save(saved);
      }

      // 🔥 DEVOLVER EL COMBO USANDO EL MANAGER DENTRO DE LA TRANSACCIÓN
      return await comboRepo.findOne({
        where: { id: saved.id },
        relations: { items: { product: true }, priceLists: true },
      });
    });
  }

  async update(id: string, dto: UpdateComboDto) {
    return this.ds.transaction(async (m) => {
      const comboRepo = m.getRepository(Combo);
      const itemRepo = m.getRepository(ComboItem);
      const priceListRepo = m.getRepository(PriceList);

      const combo = await comboRepo.findOne({
        where: { id },
        relations: { items: true, priceLists: true },
      });
      if (!combo) throw new NotFoundException('Combo no encontrado');

      // -------- CAMPOS BÁSICOS --------
      if (dto.name !== undefined) combo.name = dto.name;
      if (dto.description !== undefined)
        combo.description = dto.description ?? null;
      if (dto.price !== undefined) combo.price = dto.price;
      if (dto.badges !== undefined) combo.badges = dto.badges ?? [];
      if (dto.imageUrl !== undefined) combo.imageUrl = dto.imageUrl;

      // -------- SLUG --------
      if (dto.slug || dto.name) {
        const base = dto.slug ?? dto.name ?? combo.slug;
        combo.slug = await this.uniqueSlug(base, id);
      }

      // -------- REEMPLAZAR ITEMS --------
      if (dto.items) {
        await itemRepo.delete({ combo: { id } });

        for (const i of dto.items) {
          const product = await this.productRepo.findOne({
            where: { id: i.productId },
          });
          if (!product) throw new BadRequestException('Producto inválido');

          const newItem = itemRepo.create({
            combo,
            product,
            qty: i.qty,
            unitType: i.unitType,
          });

          await itemRepo.save(newItem);
        }
      }

      // -------- REEMPLAZAR PRICE LISTS --------
      if (dto.priceListIds !== undefined) {
        combo.priceLists = await priceListRepo.findByIds(dto.priceListIds);
      }

      await comboRepo.save(combo);

      // 🔥 devolver usando el manager
      return comboRepo.findOne({
        where: { id },
        relations: { items: { product: true }, priceLists: true },
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
  async list(priceListId?: string) {
    let priceList: PriceList | null = null;

    if (priceListId) {
      priceList = await this.priceListRepo.findOne({
        where: { id: priceListId, active: true },
      });
      if (!priceList) throw new NotFoundException('Lista no encontrada');
    }

    if (!priceList) {
      priceList = await this.priceListRepo.findOne({
        where: { active: true },
        order: { priority: 'ASC' },
      });
    }

    let combos = await this.repo.find({
      where: { active: true },
      relations: { items: { product: true }, priceLists: true },
      order: { name: 'ASC' },
    });

    // FILTRO POR PRICE LIST ID
    if (priceList) {
      combos = combos.filter((c) =>
        c.priceLists.some((pl) => pl.id === priceList.id),
      );

      // CALCULAR PRECIOS
      for (const c of combos) {
        for (const item of c.items) {
          const pp = await this.priceRepo.findOne({
            where: {
              product: { id: item.product.id },
              priceList: { id: priceList.id },
            },
          });

          item.product['price'] = pp?.price ?? null;
          item.product['compareAtPrice'] = pp?.compareAtPrice ?? null;
        }
      }
    }

    return combos;
  }
}
