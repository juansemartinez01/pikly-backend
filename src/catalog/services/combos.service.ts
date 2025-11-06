import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Combo } from '../entities/combo.entity';

@Injectable()
export class CombosService {
  constructor(@InjectRepository(Combo) private repo: Repository<Combo>) {}

  async list() {
    const items = await this.repo.find({
      where: { active: true },
      order: { name: 'ASC' },
      relations: { items: { product: true } },
      select: {
        id: true,
        name: true,
        slug: true,
        currency: true,
        price: true,
        badges: true,
        imageUrl: true,
        items: {
          id: true,
          qty: true,
          unitType: true,
          product: { id: true, name: true, slug: true, unitType: true },
        },
      },
    });
    return items;
  }
}
