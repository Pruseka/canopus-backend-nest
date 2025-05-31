import { Injectable } from '@nestjs/common';
import { SignUpDto, SignInDto } from './dto';
import { Validator } from '../common/utils/validator';

@Injectable()
export class AuthServiceExample {
  // Example of manual validation with throwing
  async signUpWithValidation(dto: any) {
    try {
      // This will throw ValidationException if validation fails
      const validatedDto = await Validator.validateDTO(SignUpDto, dto);

      // Continue with the validated DTO
      return { success: true, user: validatedDto };
    } catch (error) {
      // The ValidationExceptionFilter will handle the error
      throw error;
    }
  }

  // Example of manual validation without throwing
  async signInWithValidation(dto: any) {
    // This will not throw an exception
    const validation = await Validator.validateDTOWithoutThrowing(
      SignInDto,
      dto,
    );

    if (!validation.isValid && validation.errors) {
      // Handle validation errors manually
      return {
        success: false,
        error: {
          field: validation.errors[0]?.field || 'unknown',
          message: validation.errors[0]?.message || 'Validation failed',
        },
      };
    }

    // Continue with the validated DTO
    const validatedDto = validation.value;
    return { success: true, user: validatedDto };
  }
}
