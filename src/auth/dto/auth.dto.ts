import {
  Contains,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { IsPasswordValid } from '../decorators';
import { Type } from 'class-transformer';

export class SignUpDto {
  @IsNotEmpty()
  @IsString()
  @Length(4, 20)
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

export class SignInErrorDto {
  @IsString()
  @IsNotEmpty()
  field: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}

export class SignInDto {
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

  @IsOptional()
  @ValidateNested()
  @Type(() => SignInErrorDto)
  error?: SignInErrorDto;
}
