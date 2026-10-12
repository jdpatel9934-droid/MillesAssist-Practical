import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'admin_hub_super_secret_jwt_production_grade_key_2026',
  expiresIn: process.env.JWT_EXPIRATION || '86400s',
}));
