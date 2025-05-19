import { Controller, Post, Get, Param, Body, BadRequestException, Patch, UseInterceptors, UploadedFile } from "@nestjs/common";
import { EmpresaService } from "./business.service";
import { Empresa } from "../../repository/business/business.entity";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('v1/business')
export class EmpresaController {
    constructor(private readonly businessService: EmpresaService) { }

    @Get()
    public async getAllBusinesses(): Promise<Empresa[]> {
        return this.businessService.getAllBusinesses();
    }

    @Get(':rut')
    public async getBusinessByRut(@Param('rut') rut: string): Promise<Empresa> {
        const business = await this.businessService.getBusinessByRut(rut);
        if (!business) {
            throw new BadRequestException('Empresa no encontrada');
        }
        return business;
    }

    @Post()
    public async createBusiness(@Body() createBusinessDto: CreateBusinessDto): Promise<Empresa> {
        const business = await this.businessService.createBusiness(createBusinessDto);
        if (!business) {
            throw new BadRequestException('Error al crear la empresa');
        }
        return business;
    }

    @Post('upload-logo/:rut')
    @UseInterceptors(
        FileInterceptor('logo', {
            storage: diskStorage({
                destination: './logos_empresas',
                filename: (req, file, callback) => {
                    const rut = req.params.rut;
                    const filename = `logo_empresa_${rut}.png`;
                    callback(null, filename);
                },
            }),
            fileFilter: (req, file, callback) => {
                if (file.mimetype !== 'image/png') {
                    return callback(new BadRequestException('Solo se permiten archivos PNG'), false);
                }
                callback(null, true);
            },
        }),
    )
    public async uploadLogo(
        @Param('rut') rut: string,
        @UploadedFile() file: Express.Multer.File,
    ): Promise<Empresa> {
        if (!file) {
            throw new BadRequestException('Archivo no encontrado o formato no permitido');
        }

        const business = await this.businessService.uploadBusinessLogo(rut, file);

        return business;
    }
}
