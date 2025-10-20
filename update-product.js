// netlify/functions/update-product.js
const { Pool } = require('pg');

exports.handler = async (event, context) => {
  // Solo se permiten peticiones PUT
  if (event.httpMethod !== 'PUT') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { id, ...product } = JSON.parse(event.body);
    if (!id) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Product ID is required' }) };
    }

    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    const query = `
      UPDATE products SET
        name = $1, sku = $2, description = $3, sale_price = $4, discount_price = $5,
        purchase_price = $6, wholesale_price = $7, stock = $8, category = $9,
        brand = $10, barcode = $11, photo_url_1 = $12, photo_url_2 = $13,
        photo_url_3 = $14, photo_url_4 = $15, photo_url_5 = $16, photo_url_6 = $17,
        photo_url_7 = $18, photo_url_8 = $19
      WHERE id = $20
      RETURNING *;
    `;

    const values = [
      product.name, product.sku, product.description,
      product.sale_price || null, product.discount_price || null,
      product.purchase_price || null, product.wholesale_price || null,
      product.stock || 0, product.category, product.brand, product.barcode,
      product.photo_url_1, product.photo_url_2, product.photo_url_3, product.photo_url_4,
      product.photo_url_5, product.photo_url_6, product.photo_url_7, product.photo_url_8,
      id
    ];

    const { rows } = await pool.query(query, values);
    await pool.end();
    
    if (rows.length === 0) {
         return { statusCode: 404, body: JSON.stringify({ error: 'Product not found' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(rows[0]),
    };
  } catch (error) {
    console.error('Error updating product:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update product', details: error.message }),
    };
  }
};
