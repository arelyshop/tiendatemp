// netlify/functions/delete-product.js
const { Pool } = require('pg');

exports.handler = async (event, context) => {
  // Solo se permiten peticiones DELETE
  if (event.httpMethod !== 'DELETE') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { id } = JSON.parse(event.body);
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

    const query = `DELETE FROM products WHERE id = $1 RETURNING *;`;
    const { rows } = await pool.query(query, [id]);
    await pool.end();

    if (rows.length === 0) {
         return { statusCode: 404, body: JSON.stringify({ error: 'Product not found' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: `Product "${rows[0].name}" deleted successfully.` }),
    };
  } catch (error) {
    console.error('Error deleting product:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to delete product', details: error.message }),
    };
  }
};
