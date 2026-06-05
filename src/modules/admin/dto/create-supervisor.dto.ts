import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateSupervisorDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    nombres: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    apellidos: string;

    @IsEmail()
    @MaxLength(255)
    email: string;

    @IsString()
    @MinLength(8)
    @MaxLength(255)
    password: string;
}
