const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('❌ La variable de entorno DATABASE_URL no está definida. Revisa tu .env en local o Railway.');
}

const isProduction = process.env.NODE_ENV === 'production';

const sslConfig = isProduction 
    ? { rejectUnauthorized: false } 
    : false; 


const poolConfig = {
    connectionString: connectionString,
    ssl: sslConfig, 
};

const pool = new Pool(poolConfig);

const initializeDB = async () => {
    try {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                sender VARCHAR(50) NOT NULL,
                room VARCHAR(50) NOT NULL,
                text TEXT NOT NULL,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await pool.query(createTableQuery); 
        console.log('✅ PostgreSQL: Tabla de mensajes verificada/creada.');
    } catch (err) {
        console.error(`❌ Error al inicializar la base de datos: ${err.message}`);
        throw err; 
    }
};

const query = (text, params) => {
    return pool.query(text, params);
};

module.exports = {
    query,
    initializeDB
};