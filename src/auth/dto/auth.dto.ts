import {
  Contains,
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
} from 'class-validator';
import { IsPasswordValid } from '../decorators';

export class AuthDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 20)
  username: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @IsPasswordValid({
    message:
      'Password must be at least 8 characters long, contain a letter, a number, and a special character',
  })
  password: string;
}
