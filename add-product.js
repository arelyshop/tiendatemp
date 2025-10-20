// netlify/functions/add-product.js

const { Pool } = require('pg');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set.');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database connection string is missing.' }),
    };
  }

  try {
    const product = JSON.parse(event.body);
    
    const pool = new Pool({
      connectionString,
      // Neon y otras bases de datos en la nube requieren SSL
      ssl: {
        rejectUnauthorized: false
      }
    });

    const query = `
      INSERT INTO products (
        name, sku, description, sale_price, discount_price, purchase_price, 
        wholesale_price, stock, category, brand, barcode, 
        photo_url_1, photo_url_2, photo_url_3, photo_url_4, 
        photo_url_5, photo_url_6, photo_url_7, photo_url_8
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
        $13, $14, $15, $16, $17, $18, $19
      ) RETURNING *;
    `;

    const values = [
      product.name,
      product.sku,
      product.description,
      product.sale_price || null,
      product.discount_price || null,
      product.purchase_price || null,
      product.wholesale_price || null,
      product.stock || 0,
      product.category,
      product.brand,
      product.barcode,
      product.photo_url_1,
      product.photo_url_2,
      product.photo_url_3,
      product.photo_url_4,
      product.photo_url_5,
      product.photo_url_6,
      product.photo_url_7,
      product.photo_url_8
    ];

    const { rows } = await pool.query(query, values);
    await pool.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(rows[0]),
    };
  } catch (error) {
    console.error('Error adding product:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to add product', details: error.message }),
    };
  }
};
