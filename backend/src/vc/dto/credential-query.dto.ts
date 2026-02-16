import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  IsArray,
  IsUUID,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerifiableCredentialStatus } from '@prisma/client';

export class FindAllCredentialsQueryDto {
  @ApiPropertyOptional({
    description: 'Array of credential IDs to filter by',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Type(() => String)
  ids?: string[];

  @ApiPropertyOptional({ enum: VerifiableCredentialStatus })
  @IsOptional()
  @IsEnum(VerifiableCredentialStatus)
  status?: VerifiableCredentialStatus;

  @ApiProperty({
    description: 'Page number',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['createdAt', 'issuedAt', 'status'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
