// netlify/functions/get-products.js

const { Pool } = require('pg');

exports.handler = async (event, context) => {
  const connectionString = process.env.DATABASE_URL;

  // Verificamos si la variable de entorno existe
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set.');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database connection string is missing.' }),
    };
  }

  const pool = new Pool({
    connectionString,
    // Neon y otras bases de datos en la nube requieren SSL
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    await pool.end();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(rows),
    };
  } catch (error) {
    console.error('Database Query Error:', error);
    await pool.end();
    return {
      statusCode: 500,
      // Devolvemos un error más detallado para facilitar el diagnóstico
      body: JSON.stringify({ error: 'Failed to fetch products', details: error.message }),
    };
  }
};
