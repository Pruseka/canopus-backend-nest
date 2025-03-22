import { ApiProperty } from '@nestjs/swagger';
import { TokensResponseDto } from '../interfaces/tokens-response.interface';
import { UserEntity } from 'src/user/entities';

export class AuthResponseDto {
  @ApiProperty({ type: TokensResponseDto })
  tokens: TokensResponseDto;

  @ApiProperty({ type: () => UserEntity })
  user: UserEntity;
}
