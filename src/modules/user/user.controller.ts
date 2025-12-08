import { Controller, Get, Post, Body, Param, UseInterceptors, UploadedFile, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import * as path from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
@Controller('v1/user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    private readonly uploadDir = path.join(
        __dirname,
        '..',
        '..',
        'Documents/UploadsCv.Tuempleo',
    );

    @Get('/all')
    getAllUsers() {
        return this.userService.getAllUsers();
    }

    @Get('registro/:id')
    getUserById(@Param('id') id: number) {
        return this.userService.getUserById(id);
    }

    @Post()
    createUser(@Body() userData: any) {
        return this.userService.createUser(userData);
    }

    @Get('/:id')
    getUsarioById(@Param('id') id: number) {
        return this.userService.getUsuarioByIdFromUsers(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('upload/profile-photo')
    @UseInterceptors(FileInterceptor('file'))
    async uploadProfilePhoto(
        @UploadedFile() file: Express.Multer.File,
        @Req() req: Request,
    ) {
        if (!file) {
            throw new BadRequestException('No se recibió ningún archivo');
        }

        // 🔹 Obtener usuario autenticado
        const user = req.user as any;
        const userId = user?.sub ?? user?.id ?? null;

        if (!userId) {
            throw new BadRequestException('Usuario no autenticado');
        }

        // Llamar al servicio para guardar la foto
        return await this.userService.uploadProfilePhoto(userId, file);
    }

}
