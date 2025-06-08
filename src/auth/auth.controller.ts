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
import { AuthResponseDto, SignInDto, SignInErrorDto, SignUpDto } from './dto';
import { Public } from './decorators';
import { Response } from 'express';
import { GetCurrentUser } from './decorators';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard, RefreshTokenGuard } from './guard';
import { GetCurrentUserId } from './decorators';
import { ApiResponse } from '@nestjs/swagger';
import { UserEntity } from 'src/user/entities';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Public()
  @ApiResponse({
    status: 201,
    description: 'Sign up',
    type: AuthResponseDto,
  })
  @Post('signup')
  async signUp(@Body() dto: SignUpDto): Promise<AuthResponseDto> {
    const { tokens, user, error } = await this.authService.signUp(dto);

    if (error || !tokens || !user) {
      return {
        tokens,
        user,
        error,
      };
    }

    const userWithoutPassword = new UserEntity(user);

    return {
      tokens,
      user: userWithoutPassword,
      error,
    };
  }

  @Public()
  @ApiResponse({ status: 200, description: 'Sign in', type: AuthResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signIn(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const { tokens, user, error } = await this.authService.signIn(dto);

    if (error || !tokens || !user) {
      return {
        tokens,
        user,
        error,
      };
    }

    this.setRefreshTokenCookie(response, tokens.refreshToken);

    const userWithoutPassword = new UserEntity(user);

    return {
      tokens,
      user: userWithoutPassword,
      error,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('signout')
  async signOut(@GetCurrentUser() user: UserEntity) {
    await this.authService.signOut(user.id);
    return { message: 'Signed out successfully' };
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

    this.setRefreshTokenCookie(response, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
    };
  }

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
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
