import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { User, Role } from '@prisma/client';

export class UserEntity implements User {
  @ApiProperty({
    description: 'Unique identifier for the user',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  email: string;

  @Exclude()
  password: string;

  @Exclude()
  pin: string | null;

  @Exclude()
  pinAttempts: number;

  @Exclude()
  refreshToken: string | null;

  @ApiProperty({
    description: 'Role of the user in the system',
    enum: ['HOLDER', 'ISSUER', 'VERIFIER', 'ADMIN'],
    example: 'HOLDER',
  })
  role: Role;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
