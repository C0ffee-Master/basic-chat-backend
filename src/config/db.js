const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.PGUSER ?? 'postgres',
    host: process.env.PGHOST ?? 'localhost',
    database: process.env.PGDATABASE ?? 'chat_db',
    password: process.env.PGPASSWORD ?? 'admin',
    port: parseInt(process.env.PGPORT) || 5432,
});

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
        console.error('❌ Error al inicializar la base de datos:', err);
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    initializeDB
};