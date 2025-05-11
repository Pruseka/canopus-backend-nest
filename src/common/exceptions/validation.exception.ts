import { BadRequestException, ValidationError } from '@nestjs/common';

export class ValidationException extends BadRequestException {
  constructor(public validationErrors: ValidationError[]) {
    super('Validation failed');
  }
}
