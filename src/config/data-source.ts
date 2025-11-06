import 'dotenv/config';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

const parseBool = (v?: string) =>
  v ? ['true', '1', 'yes'].includes(v.toLowerCase()) : false;

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: parseBool(process.env.DB_SSL) ? { rejectUnauthorized: false } : false,
  entities: [__dirname + '/../**/*.entity.{ts,js}'],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  namingStrategy: new SnakeNamingStrategy(),
  logging: process.env.ORM_LOGGING === 'true',
});
