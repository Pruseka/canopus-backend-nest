import { TokensResponse } from './interfaces/tokens-response.interface';
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
import { AuthDto } from './dto';
import { Public } from './decorators/public.decorator';
import { Response, response } from 'express';
import { GetCurrentUser } from './decorators/get-current-user.decorator';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenGuard } from './guard';
import { GetCurrentUserId } from './decorators/get-current-user-id.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Public()
  @Post('signup')
  signUp(@Body() dto: AuthDto) {
    return this.authService.signUp(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signIn(
    @Body() dto: AuthDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ tokens: TokensResponse; user: Partial<User> }> {
    const { tokens, user } = await this.authService.signIn(dto);

    this.setRefreshTokenCookie(response, tokens.refreshToken);

    return {
      tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @GetCurrentUserId() userId: string,
    @GetCurrentUser('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ accessToken: string }> {
    const tokens = await this.authService.refreshTokens(userId, refreshToken);

    console.log('refreshTokens controller called');

    this.setRefreshTokenCookie(response, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
    };
  }

  @Get('profile')
  getProfile(@GetCurrentUser() user: User) {
    return user;
  }

  private setRefreshTokenCookie(
    response: Response,
    refreshToken: string,
  ): void {
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
