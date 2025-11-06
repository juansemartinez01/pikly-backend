import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

function parseBooleanEnv(v?: string): boolean {
  if (!v) return false;
  const val = v.toString().trim().toLowerCase();
  return val === 'true' || val === '1' || val === 'yes';
}

export const typeOrmAsyncConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
    const dbSsl = parseBooleanEnv(config.get<string>('DB_SSL'));

    const base: DataSourceOptions = {
      type: 'postgres',
      host: config.get<string>('DB_HOST'),
      port: parseInt(config.get<string>('DB_PORT') || '5432', 10),
      username: config.get<string>('DB_USER'),
      password: config.get<string>('DB_PASS'),
      database: config.get<string>('DB_NAME'),
      // Usa SSL solo si DB_SSL es true
      ssl: dbSsl ? { rejectUnauthorized: false } : false,
      entities: [__dirname + '/../**/*.entity.{ts,js}'],
      migrations: [__dirname + '/../migrations/*.{ts,js}'],
      synchronize: true,
      logging: config.get<string>('ORM_LOGGING') === 'true',
      namingStrategy: new SnakeNamingStrategy(),
    };

    return base;
  },
};
