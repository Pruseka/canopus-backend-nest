import { TokensResponseDto } from './interfaces/tokens-response.interface';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto, AuthResponseDto, LogoutResponseDto } from './dto';
import { Response } from 'express';
import { GetCurrentUser } from './decorators';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenGuard } from './guard';
import { GetCurrentUserId } from './decorators';
import { ApiResponse } from '@nestjs/swagger';
import { UserEntity } from 'src/user/entities';
import { JwtAuthGuard } from './guard/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @ApiResponse({
    status: 201,
    description: 'Sign up',
    type: AuthResponseDto,
  })
  @Post('signup')
  async signUp(
    @Body() dto: AuthDto,
  ): Promise<{ tokens: TokensResponseDto; user: UserEntity }> {
    const { tokens, user } = await this.authService.signUp(dto);

    const userWithoutPassword = new UserEntity(user);

    return {
      tokens,
      user: userWithoutPassword,
    };
  }

  @ApiResponse({ status: 200, description: 'Sign in', type: AuthResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signIn(
    @Body() dto: AuthDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const { tokens, user } = await this.authService.signIn(dto);

    this.setRefreshTokenCookie(response, tokens.refreshToken);

    const userWithoutPassword = new UserEntity(user);

    return {
      tokens,
      user: userWithoutPassword,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiResponse({ status: 200, description: 'Logout', type: LogoutResponseDto })
  @HttpCode(HttpStatus.OK)
  async logout(
    @GetCurrentUserId() userId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LogoutResponseDto> {
    await this.authService.logout(userId);

    response.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
    });

    return {
      success: true,
    };
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @GetCurrentUserId() userId: string,
    @GetCurrentUser('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ accessToken: string }> {
    const tokens = await this.authService.refreshTokens(userId, refreshToken);

    this.setRefreshTokenCookie(response, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@GetCurrentUser() user: UserEntity) {
    return user;
  }

  private setRefreshTokenCookie(
    response: Response,
    refreshToken: string,
  ): void {
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      // secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
