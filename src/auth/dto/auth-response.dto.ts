import { ApiProperty } from '@nestjs/swagger';
import { TokensResponseDto } from '../interfaces/tokens-response.interface';
import { UserEntity } from 'src/user/entities';
import { SignInErrorDto } from './auth.dto';

export class AuthResponseDto {
  @ApiProperty({ type: TokensResponseDto, nullable: true })
  tokens: TokensResponseDto | null;

  @ApiProperty({ type: () => UserEntity, nullable: true })
  user: UserEntity | null;

  @ApiProperty({ type: () => SignInErrorDto, nullable: true })
  error: SignInErrorDto | null;
}
