import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OAuthLoginDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    picture?: string | null;
}
