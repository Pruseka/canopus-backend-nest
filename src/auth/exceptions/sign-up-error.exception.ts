import { HttpException, HttpStatus } from '@nestjs/common';

export class SignupErrorException extends HttpException {
  constructor(
    errorCode: 'credentials_taken' | 'password_criteria',
    message: string,
  ) {
    super({ errorCode, message }, HttpStatus.BAD_REQUEST);
  }
}
