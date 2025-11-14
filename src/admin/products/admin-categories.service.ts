import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../catalog/entities/category.entity';
import { CreateCategoryDto } from '../../catalog/dto/create-category.dto';
import { UpdateCategoryDto } from '../../catalog/dto/update-category.dto';
import { slugify } from '../../common/slug.util';

@Injectable()
export class AdminCategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly catRepo: Repository<Category>,
  ) {}

  async list() {
    return this.catRepo.find({
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);

    const exists = await this.catRepo.findOne({ where: { slug } });
    if (exists) throw new BadRequestException('Category slug already exists');

    const cat = this.catRepo.create({
      name: dto.name,
      slug,
      order: dto.order ?? 0,
      active: dto.active ?? true,
    });
    return this.catRepo.save(cat);
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const cat = await this.catRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');

    if (dto.name) cat.name = dto.name;
    if (dto.order !== undefined) cat.order = dto.order;
    if (dto.active !== undefined) cat.active = dto.active;

    if (dto.slug) {
      const newSlug = slugify(dto.slug);
      const exists = await this.catRepo.findOne({ where: { slug: newSlug } });
      if (exists && exists.id !== cat.id) {
        throw new BadRequestException('Category slug already exists');
      }
      cat.slug = newSlug;
    }

    return this.catRepo.save(cat);
  }

  async remove(id: string) {
    const cat = await this.catRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    cat.active = false;
    return this.catRepo.save(cat);
  }
}
