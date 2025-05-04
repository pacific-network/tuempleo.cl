export default () => ({
    database: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        name: process.env.DB_NAME,
    },
    app: {
        port: Number(process.env.APP_PORT),
    },
    security: {
        jwt_secret: process.env.JWT_SECRET,
    },
});