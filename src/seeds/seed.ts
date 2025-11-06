import 'dotenv/config';
import { DataSource } from 'typeorm';
import ds from '../config/data-source';
import { Category } from '../catalog/entities/category.entity';
import { PriceList } from '../catalog/entities/price-list.entity';
import { Product } from '../catalog/entities/product.entity';
import { ProductImage } from '../catalog/entities/product-image.entity';
import { ProductPrice } from '../catalog/entities/product-price.entity';
import { Combo } from '../catalog/entities/combo.entity';
import { ComboItem } from '../catalog/entities/combo-item.entity';

async function run() {
  const source = await (ds as DataSource).initialize();
  try {
    // Categorías
    const cats = await source.getRepository(Category).save([
      { name: 'Frutas', slug: 'frutas', order: 1, active: true },
      { name: 'Verduras', slug: 'verduras', order: 2, active: true },
      { name: 'Mayorista', slug: 'mayorista', order: 3, active: true },
      { name: 'Combos', slug: 'combos', order: 4, active: true },
    ]);

    // Listas de precios
    const [retail, mayorista] = await source.getRepository(PriceList).save([
      { name: 'Retail', currency: 'ARS', active: true, priority: 1 },
      { name: 'Mayorista', currency: 'ARS', active: true, priority: 2 },
    ]);

    // Productos
    const prodRepo = source.getRepository(Product);
    const imgRepo = source.getRepository(ProductImage);
    const priceRepo = source.getRepository(ProductPrice);

    const sandia = await prodRepo.save({
      sku: 'SANDIA-001',
      name: 'Sandía Jugosa',
      slug: 'sandia-jugosa',
      unitType: 'unit',
      step: 1,
      minQty: 1,
      maxQty: 20,
      category: cats.find((c) => c.slug === 'frutas')!,
      badges: ['Oferta'],
      description: 'Sandía fresca y dulce.',
      active: true,
    });
    await imgRepo.save({
      product: sandia,
      url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994',
      alt: 'Sandía',
      order: 0,
    });
    await priceRepo.save([
      { product: sandia, priceList: retail, price: 1500, compareAtPrice: 3000 },
      { product: sandia, priceList: mayorista, price: 1200 },
    ]);

    const tomate = await prodRepo.save({
      sku: 'TOMATE-001',
      name: 'Tomate',
      slug: 'tomate',
      unitType: 'kg',
      step: 0.5,
      minQty: 0.5,
      maxQty: 20,
      category: cats.find((c) => c.slug === 'verduras')!,
      badges: ['Oferta', 'Premium'],
      active: true,
    });
    await imgRepo.save({
      product: tomate,
      url: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce',
      alt: 'Tomate',
      order: 0,
    });
    await priceRepo.save([
      { product: tomate, priceList: retail, price: 2500, compareAtPrice: 3000 },
      { product: tomate, priceList: mayorista, price: 2200 },
    ]);

    // Combo
    const combo = await source.getRepository(Combo).save({
      name: 'Combo Almuerzos',
      slug: 'combo-almuerzos',
      currency: 'ARS',
      price: 10000,
      active: true,
      badges: [],
      imageUrl: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2',
    });
    await source.getRepository(ComboItem).save([
      { combo, product: sandia, qty: 1, unitType: 'unit' },
      { combo, product: tomate, qty: 1, unitType: 'kg' },
    ]);

    console.log('✅ Seed OK');
  } finally {
    await (ds as DataSource).destroy();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
