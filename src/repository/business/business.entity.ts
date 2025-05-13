// import { Entity, PrimaryGeneratedColumn, Colum, Column } from "typeorm";

// @Entity('empresa')
// export class Empresa {

//     @PrimaryGeneratedColumn()
//     id: number;

//     @Column({ type: 'varchar', length: 255, unique: true, nullable: false, default: '' })
//     rut: string;

//     @Column({ type: 'varchar', length: 255, nullable: false })
//     razon_social: string;

//     @Column({type:'varchar', length: 255, nullable: false})
//     nombre_fantasia: string;

//     @Column({ type: 'json', nullable: false })
//     data: Record<string, any>;


//     // Dato no visibles 
//     @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
//     fecha_creacion: Date;

//     @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
//     fecha_update: Date;

//     @Colum({ type: 'int', nullable: true })
//     modificado_por: number;

// }

// //data : 
// //   {condicionFiscal:
// //     "actividadesEconomicas": [
// //       {
// //         "codigo": "9609@09",
// //         "descripcion": "OTRAS ACTIVIDADES DE SERVICIOS PERSONALES N.C.P.",
// //         "categoria": "Segunda",
// //         "afectaIVA": false,
// //         "fecha": "30-03-2010"
// //       }
// //     ],
// //     "correoIntercambio": "gonzalo.bustamante.b@gmail.com",
// //     "domicilios": [
// //       {
// //         "direccion": "DIRECCIÓN DE PRUEBA 7878",
// //         "ciudad": "",
// //         "comuna": "PUENTE ALTO"
// //       },
// //       {
// //         "direccion": "LOS AROMOS 104",
// //         "ciudad": "IQUIQUE",
// //         "comuna": "ALTO HOSPICIO"
// //       }
// //     ],
// //     "presentaInicioActividades": true,
// //     "fechaInicioActividades": "30-03-2010",
// //     "esEmpresaMenorTamano": false,
// //     "webFacturacion": ""
// //   }

