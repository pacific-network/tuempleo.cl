import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class IniciarSesionDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsNumber()
  @IsNotEmpty()
  rolId: number;
}