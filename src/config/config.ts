//src/config/config.ts

// Exporta una función que retorna la configuración de la aplicación
export default () => ({
    database: {
        // Configuración de la base de datos
        host: process.env.DB_HOST, // Dirección del host de la base de datos
        port: Number(process.env.DB_PORT), // Puerto de la base de datos
        username: process.env.DB_USERNAME, // Nombre de usuario para la base de datos
        password: process.env.DB_PASSWORD, // Contraseña para la base de datos
        name: process.env.DB_NAME, // Nombre de la base de datos
    },
    app: {
        // Configuración de la aplicación
        port: Number(process.env.APP_PORT), // Puerto en el que corre la aplicación
    },
    security: {
        // Configuración de seguridad
        jwt_secret: process.env.JWT_SECRET, // Clave secreta para JWT
    },
});
