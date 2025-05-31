import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  ValidationError,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationException } from '../exceptions/validation.exception';

@Catch(ValidationException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: ValidationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Format the validation errors
    const formattedErrors = this.formatErrors(exception.validationErrors);

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }

  private formatErrors(errors: ValidationError[]) {
    return errors.reduce((acc, error) => {
      const field = error.property;
      const message = error.constraints
        ? Object.values(error.constraints)[0]
        : 'Invalid value';

      acc[field] = { field, message };
      return acc;
    }, {});
  }
}
