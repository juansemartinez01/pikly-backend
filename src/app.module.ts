import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmAsyncConfig } from './config/typeorm.config';

import { CatalogModule } from './catalog/catalog.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { OpsModule } from './ops/ops.module';

import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD } from '@nestjs/core'; // 👈 FALTABA ESTE IMPORT
import { SearchModule } from './search/search.module';
import { CmsModule } from './cms/cms.module';
import { AdminModule } from './admin/admin.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync(typeOrmAsyncConfig),

    // Cache global (30s, máx 500 entradas)
    CacheModule.register({ isGlobal: true, ttl: 30_000, max: 500 }),

    // Rate limit global: 100 req/min por IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // Módulos de negocio
    CatalogModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    OpsModule,
    SearchModule,
    CmsModule,
    AdminModule,
    FilesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // aplica rate limit a toda la app
  ],
})
export class AppModule {}
