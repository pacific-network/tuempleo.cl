import { Controller, Get, Post, Body, Param, UseInterceptors, UploadedFile, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import * as path from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
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

    @Post('upload/profile-photo')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FileInterceptor('file'))
    async uploadProfilePhoto(
        @UploadedFile() file: Express.Multer.File,
        @Req() req: any,
    ) {
        const userId = req.user.id;
        return await this.userService.uploadProfilePhoto(userId, file);
    }

}
