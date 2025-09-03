import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsEnum,
  IsOptional,
  IsPositive,
  Min,
  IsInt,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Transform, Expose } from 'class-transformer';

// Custom validator para asegurar que se envíe size O amount, pero no ambos
function IsEitherSizeOrAmount(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isEitherSizeOrAmount',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          const dto = _args.object as CreateOrderDto;
          const hasSize = dto.size !== undefined && dto.size !== null;
          const hasAmount = dto.amount !== undefined && dto.amount !== null;

          // Debe tener exactamente uno de los dos
          return hasSize !== hasAmount; // XOR logic
        },
        defaultMessage(_args: ValidationArguments) {
          return 'Must provide either size (exact shares) OR amount (total investment in pesos), but not both';
        },
      },
    });
  };
}

// Re-export responses
export * from './responses';

// Enums para validación
export enum OrderSideDto {
  BUY = 'BUY',
  SELL = 'SELL',
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT',
}

export enum OrderTypeDto {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
}

// DTO para crear órdenes
// Soporta dos modalidades:
// 1. size: Cantidad exacta de acciones (entero)
// 2. amount: Monto total en pesos (se calculará la cantidad máxima de acciones)
export class CreateOrderDto {
  @Expose()
  @IsNotEmpty({ message: 'Instrument ID is required' })
  @IsInt({ message: 'Instrument ID must be an integer' })
  @IsPositive({ message: 'Instrument ID must be positive' })
  instrumentid!: number;

  @Expose()
  @IsNotEmpty({ message: 'User ID is required' })
  @IsInt({ message: 'User ID must be an integer' })
  @IsPositive({ message: 'User ID must be positive' })
  userid!: number;

  @Expose()
  @IsNotEmpty({ message: 'Order side is required' })
  @IsEnum(OrderSideDto, {
    message: 'Side must be BUY, SELL, CASH_IN, or CASH_OUT',
  })
  side!: OrderSideDto;

  // Modalidad 1: Cantidad exacta de acciones
  @Expose()
  @IsOptional()
  @IsInt({ message: 'Size must be an integer (no fractional shares allowed)' })
  @IsPositive({ message: 'Size must be positive' })
  @IsEitherSizeOrAmount()
  size?: number;

  // Modalidad 2: Monto total en pesos (se calculará cantidad máxima)
  @Expose()
  @IsOptional()
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be positive' })
  amount?: number;

  @Expose()
  @IsOptional()
  @IsNumber({}, { message: 'Price must be a number' })
  @IsPositive({ message: 'Price must be positive' })
  price?: number;

  @Expose()
  @IsNotEmpty({ message: 'Order type is required' })
  @IsEnum(OrderTypeDto, { message: 'Type must be MARKET or LIMIT' })
  type!: OrderTypeDto;
}

// DTO para búsqueda de instrumentos
export class SearchInstrumentsDto {
  @Expose()
  @IsNotEmpty({ message: 'Search query is required' })
  @IsString({ message: 'Query must be a string' })
  @Transform(({ value }) => value?.trim())
  q!: string;

  @Expose()
  @IsOptional()
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;
}

// DTO para parámetros de portfolio
export class GetPortfolioDto {
  @Expose()
  @IsNotEmpty({ message: 'User ID is required' })
  @IsInt({ message: 'User ID must be an integer' })
  @IsPositive({ message: 'User ID must be positive' })
  @Transform(({ value }) => parseInt(value, 10))
  userId!: number;
}
