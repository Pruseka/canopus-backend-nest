import { ValidationError, validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ValidationException } from '../exceptions/validation.exception';

export class Validator {
  /**
   * Manually validate a DTO object and throw a ValidationException if validation fails
   * @param dto The DTO class
   * @param object The object to validate
   * @returns The validated object
   */
  static async validateDTO<T extends object>(
    dto: new () => T,
    object: object,
  ): Promise<T> {
    const instance = plainToInstance(dto, object);
    const errors = await validate(instance);

    if (errors.length > 0) {
      throw new ValidationException(errors);
    }

    return instance as T;
  }

  /**
   * Manually validate a DTO object and return errors if validation fails
   * @param dto The DTO class
   * @param object The object to validate
   * @returns An object with the validation result and errors
   */
  static async validateDTOWithoutThrowing<T extends object>(
    dto: new () => T,
    object: object,
  ): Promise<{
    isValid: boolean;
    errors: { field: string; message: string }[] | null;
    value: T | null;
  }> {
    const instance = plainToInstance(dto, object);
    const errors = await validate(instance);

    if (errors.length > 0) {
      return {
        isValid: false,
        errors: this.formatErrors(errors),
        value: null,
      };
    }

    return {
      isValid: true,
      errors: null,
      value: instance as T,
    };
  }

  private static formatErrors(
    errors: ValidationError[],
  ): { field: string; message: string }[] {
    return errors.map((error) => {
      const message = error.constraints
        ? Object.values(error.constraints)[0]
        : 'Invalid value';

      return {
        field: error.property,
        message,
      };
    });
  }
}
