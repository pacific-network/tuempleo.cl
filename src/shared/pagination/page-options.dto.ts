import { ApiPropertyOptional } from "@nestjs/swagger";
import { Order } from "./constants";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class PageOptionsDto {
    @ApiPropertyOptional({ enum: Order, default: Order.DESC })
    @IsEnum(Order)
    @IsOptional()
    @Transform(({ value }) => value)
    readonly order: Order = Order.DESC;

    @IsOptional()
    @IsString()
    readonly search: string;


    @IsOptional()
    @IsString()
    readonly type: string;

    @ApiPropertyOptional({
        minimum: 1,
        default: 1,
    })
    @IsInt()
    @Min(1)
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    readonly page: number = 1;

    @ApiPropertyOptional({
        minimum: 1,
        maximum: 50,
        default: 10,
    })
    @IsInt()
    @Min(1)
    @Max(50)
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    readonly take: number = 10;

    get skip(): number {
        return (this.page - 1) * this.take;
    }

}