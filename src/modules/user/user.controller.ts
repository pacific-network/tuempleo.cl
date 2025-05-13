import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('v1/user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Get(':id')
    getUserById(@Param('id') id: number) {
        return this.userService.getUserById(id);
    }

    @Post()
    createUser(@Body() userData: any) {
        return this.userService.createUser(userData);
    }


}
