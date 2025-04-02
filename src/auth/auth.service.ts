import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { TokensResponseDto } from './interfaces/tokens-response.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserService } from 'src/user/user.service';
import { SignupErrorException } from './exceptions/sign-up-error.exception';
import { UserEntity } from 'src/user/entities/';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private user: UserService,
  ) {}
  async signUp(
    dto: AuthDto,
  ): Promise<{ tokens: TokensResponseDto; user: UserEntity }> {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (existingUser)
      throw new UnauthorizedException(
        'credentials_taken',
        'The user with this email already exists',
      );

    const hash = await argon.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hash,
      },
    });

    return this.signToken(user);
  }

  async signIn(dto: AuthDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) throw new ForbiddenException('Invalid credentials');

    const pwMatches = await argon.verify(user.password, dto.password);

    if (!pwMatches) throw new ForbiddenException('Incorrect Password');

    return this.signToken(user);
  }

  async logout(userId: string): Promise<boolean> {
    await this.user.updateRefreshToken(userId, null);

    return true;
  }

  async signToken(user: UserEntity): Promise<{
    tokens: TokensResponseDto;
    user: UserEntity;
  }> {
    const tokens = await this.getTokens(user.id, user.email);

    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return { tokens, user };
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<TokensResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access Denied. No refresh token found');
    }

    const isRefreshTokenValid = await argon.verify(
      user.refreshToken,
      refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new ForbiddenException('Access Denied, Invalid refresh token');
    }

    const tokens = await this.getTokens(user.id, user.email);

    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  private async getTokens(
    userId: string,
    email: string,
  ): Promise<TokensResponseDto> {
    const jwtPayload: JwtPayload = {
      sub: userId,
      email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(jwtPayload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRATION_TIME') || '1m',
      }),

      this.jwt.signAsync(jwtPayload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRATION_TIME') || '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateRefreshTokenHash(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await argon.hash(refreshToken);

    await this.user.updateRefreshToken(userId, hashedRefreshToken);
  }

  private isPasswordValid(password: string): boolean {
    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    return passwordPattern.test(password);
  }
}
