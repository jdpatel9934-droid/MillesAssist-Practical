import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'admin_hub_db',
  schema: process.env.DB_SCHEMA || 'public',
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  entities: [
    path.join(__dirname, '../modules/**/**/*.entity{.ts,.js}')
  ],
  migrations: [path.join(__dirname, '../database/migrations/**/*{.ts,.js}')],
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
