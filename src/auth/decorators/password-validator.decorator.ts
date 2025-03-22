// password-validator.decorator.ts

import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsPasswordValid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsPasswordValid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string, args: ValidationArguments) {
          // Password validation logic
          const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
          return typeof value === 'string' && passwordPattern.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return 'Password is too weak. It must be at least 8 characters long, contain a letter, a number, and a special character.';
        },
      },
    });
  };
}
