import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards, Get } from "@nestjs/common";
import { RoleService } from "./role.service";
import { Rol } from "src/repository/role/role.entity";
import { AuthGuard } from "../auth/guards/auth.guards";

@Controller('v1/role')
export class RoleController {
    constructor(private readonly roleService: RoleService) { }
    

    @Get()
    async getAllRoles(): Promise<Rol[]> {
        return await this.roleService.findAll();
    }

    @UseGuards(AuthGuard)
    @Post()
    async createRole(@Body() roleData: Rol): Promise<Rol> {
        return await this.roleService.create(roleData);
    }

}   