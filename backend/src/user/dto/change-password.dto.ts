import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Old password of the user',
    example: 'oldPassword123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Old password is required' })
  oldPassword: string;

  @ApiProperty({
    description:
      'New password (minimum 8 characters, at least 1 digit and 1 uppercase letter)',
    example: 'newStrongPassword456!',
  })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password is too weak. Please include uppercase letters and digits.',
  })
  newPassword: string;
}
