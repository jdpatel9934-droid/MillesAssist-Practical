import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { UserStatus } from '../../common/enums/user-status.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) { }

  async login(loginDto: LoginDto) {
    try {
      const { email, password } = loginDto;

      const user = await this.userRepository.findOne({
        where: { email: email.toLowerCase().trim() },
        select: ['id', 'email', 'fullName', 'password', 'role', 'status'],
      });

      if (!user) {
        this.logger.warn(`Failed login attempt for non-existent email: ${email}`);
        throw new UnauthorizedException('Invalid email or password.');
      }

      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException(`Account is ${user.status.toLowerCase()}. Please contact an administrator.`);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        this.logger.warn(`Failed password verification for user: ${email}`);
        throw new UnauthorizedException('Invalid email or password.');
      }

      user.lastLoginAt = new Date();
      await this.userRepository.save(user);

      const payload = { sub: user.id, email: user.email, role: user.role };
      const accessToken = this.jwtService.sign(payload, {
        expiresIn: Number(process.env.JWT_EXPIRATION) || 86400,
      });

      this.logger.log(`Successful login for user: ${user.email} (${user.role})`);

      return { success: true, data: { accessToken }, message: 'Login successful' };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.error(`login failed: ${(err as Error).message}`, (err as Error).stack);
      throw new UnauthorizedException('Authentication failed. Please try again.');
    }
  }

  async getProfile(userId: string) {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new UnauthorizedException('User profile not found.');
      }

      return user;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.error(`getProfile failed [userId=${userId}]: ${(err as Error).message}`, (err as Error).stack);
      throw new UnauthorizedException('Failed to retrieve profile.');
    }
  }
}
