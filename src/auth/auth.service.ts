import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Status, User, UserAccessLevel } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as argon from 'argon2';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserEntity } from 'src/user/entities/';
import { UserService } from 'src/user/user.service';
import { Validator } from '../common/utils/validator';
import { AuthResponseDto, SignInDto, SignInErrorDto, SignUpDto } from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { TokensResponseDto } from './interfaces/tokens-response.interface';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private user: UserService,
  ) {}

  async signUp(dto: SignUpDto): Promise<AuthResponseDto> {
    try {
      const validation = await Validator.validateDTOWithoutThrowing(
        SignUpDto,
        dto,
      );

      if (!validation.isValid || !validation.value) {
        return {
          tokens: null,
          user: null,
          error: {
            field: validation.errors?.[0]?.field || 'unknown',
            message: validation.errors?.[0]?.message || 'Validation failed',
          },
        };
      }

      const validatedDto = validation.value;

      const existingUser = await this.prisma.user.findUnique({
        where: {
          email: validatedDto.email,
        },
      });

      if (existingUser) {
        return {
          tokens: null,
          user: null,
          error: {
            field: 'email',
            message: 'The user with this email already exists',
          },
        };
      }

      const hash = await argon.hash(dto.password);

      const user = await this.prisma.user.create({
        data: {
          name: dto.username,
          email: dto.email,
          password: hash,
          accessLevel: UserAccessLevel.USER,
          autoCredit: false,
          dataCredit: BigInt(0),
          status: Status.PENDING,
          portalConnectedAt: null,
          timeCredit: BigInt(0),
          displayName: dto.username,
        },
      });

      const { tokens, user: userEntity } = await this.signToken(user);

      return { tokens, user: userEntity, error: null };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return {
            tokens: null,
            user: null,
            error: {
              field: 'email',
              message: 'The user with this email already exists',
            },
          };
        }
      }

      return {
        tokens: null,
        user: null,
        error: {
          field: 'password',
          message: 'Error creating user. Please try again.',
        },
      };
    }
  }

  async signIn(dto: SignInDto): Promise<{
    tokens: TokensResponseDto | null;
    user: UserEntity | null;
    error: SignInErrorDto | null;
  }> {
    const validation = await Validator.validateDTOWithoutThrowing(
      SignInDto,
      dto,
    );

    if (!validation.isValid || !validation.value) {
      return {
        tokens: null,
        user: null,
        error: {
          field: validation.errors?.[0]?.field || 'unknown',
          message: validation.errors?.[0]?.message || 'Validation failed',
        },
      };
    }

    const validatedDto = validation.value;

    const user = await this.prisma.user.findUnique({
      where: {
        email: validatedDto.email,
      },
    });

    if (!user) {
      return {
        tokens: null,
        user: null,
        error: {
          field: 'email',
          message: 'User not found with this email',
        },
      };
    }
    const pwMatches = await argon.verify(user.password, validatedDto.password);

    if (!pwMatches) {
      return {
        tokens: null,
        user: null,
        error: {
          field: 'password',
          message: 'Incorrect Password',
        },
      };
    }

    const { tokens, user: userEntity } = await this.signToken(user);

    return { tokens, user: userEntity, error: null };
  }

  async signOut(userId: string): Promise<void> {
    await this.user.updateRefreshToken(userId, '');
  }

  async signToken(user: User): Promise<{
    tokens: TokensResponseDto;
    user: UserEntity;
  }> {
    const tokens = await this.getTokens(user.id, user.email);

    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    // Create a UserEntity instance to properly handle BigInt conversion
    const userEntity = new UserEntity(user);

    return { tokens, user: userEntity };
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<TokensResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access Denied');
    }

    const isRefreshTokenValid = await argon.verify(
      user.refreshToken,
      refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new ForbiddenException('Access Denied');
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
        expiresIn: this.config.get('JWT_EXPIRATION_TIME') || '30m',
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
