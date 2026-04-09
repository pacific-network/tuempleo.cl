import { Controller, Post, Get, Param, Body, BadRequestException, Patch, UseInterceptors, UploadedFile, ParseIntPipe } from "@nestjs/common";
import { EmpresaService } from "./business.service";
import { Empresa } from "../../repository/business/business.entity";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('v1/empresas')
export class EmpresaController {
    constructor(private readonly businessService: EmpresaService) { }

    @Get()
    public async getAllBusinesses(): Promise<Empresa[]> {
        return this.businessService.getAllBusinesses();
    }

    @Get(':id')
    public async getBusinessById(@Param('id', ParseIntPipe) id: number): Promise<Empresa> {
        return this.businessService.getBusinessById(id);
    }

    @Get('rut/:rut')
    public async getBusinessByRut(@Param('rut') rut: string): Promise<Empresa> {
        const business = await this.businessService.getBusinessByRut(rut);
        if (!business) {
            throw new BadRequestException('Empresa no encontrada');
        }
        return business;
    }

    @Get('check-rut/:rut')
    public async checkRut(@Param('rut') rut: string) {
        return this.businessService.checkRutExists(rut);
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
                destination: (req, file, cb) => {
                    const uploadBase = process.env.UPLOAD_PATH || './upload';
                    const dest = `${uploadBase}/logos`;
                    const fs = require('fs');
                    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
                    cb(null, dest);
                },
                filename: (req, file, callback) => {
                    const rut = req.params.rut;
                    const ext = extname(file.originalname) || '.png';
                    callback(null, `logo_empresa_${rut}${ext}`);
                },
            }),
            fileFilter: (req, file, callback) => {
                const allowed = ['image/png', 'image/jpeg', 'image/webp'];
                if (!allowed.includes(file.mimetype)) {
                    return callback(new BadRequestException('Solo se permiten archivos PNG, JPG o WebP'), false);
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

        return this.businessService.uploadBusinessLogo(rut, file);
    }
}
