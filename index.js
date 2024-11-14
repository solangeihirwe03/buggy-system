
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const dotenv = require("dotenv");
dotenv.config()

const app = express();
app.use(bodyParser.json());

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
});

app.get("/", (req,res)=>{res.status(200).json({status:200, message: "Welcome to buggy"})})


const handleDatabaseError = (err, res) => {
  console.error('Database Error:', err);
  
  switch (err.code) {
    case '23503': 
      return res.status(400).json({ error: 'Referenced record does not exist' });
    case '23505': 
      return res.status(400).json({ error: 'Duplicate entry' });
    case '23514': 
      return res.status(400).json({ error: 'Data validation failed' });
    default:
      return res.status(500).json({ error: 'Database error' });
  }
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};


app.post('/users', async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email || typeof name !== 'string' || typeof email !== 'string') {
    return res.status(400).json({ error: 'Name and email are required and must be strings' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING user_id',
      [name, email]
    );
    res.status(201).json({
      message: 'User created',
      user_id: result.rows[0].user_id
    });
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      return res.status(400).json({ error: 'Email already exists' });
    }
    handleDatabaseError(err, res);
  }
});

app.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, name, email FROM users ORDER BY user_id'
    );
    res.json(result.rows);
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

app.get('/users/:id', async (req, res) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    const result = await pool.query(
      'SELECT user_id, name, email FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

app.put('/users/:id', async (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, email } = req.body;

  if (!name || !email || typeof name !== 'string' || typeof email !== 'string') {
    return res.status(400).json({ error: 'Name and email are required and must be strings' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2 WHERE user_id = $3 RETURNING *',
      [name, email, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated',
      user: result.rows[0]
    });
  } catch (err) {
    if (err.code === '23505') { 
      return res.status(400).json({ error: 'Email already exists' });
    }
    handleDatabaseError(err, res);
  }
});

app.delete('/users/:id', async (req, res) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderCheck = await client.query(
        'SELECT 1 FROM orders WHERE user_id = $1 LIMIT 1',
        [userId]
      );

      if (orderCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Cannot delete user with existing orders' });
      }

      const result = await client.query(
        'DELETE FROM users WHERE user_id = $1 RETURNING *',
        [userId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }

      await client.query('COMMIT');
      res.json({
        message: 'User deleted',
        user: result.rows[0]
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

app.post('/orders', async (req, res) => {
  const { user_id, order_total } = req.body;

  if (!user_id || typeof user_id !== 'number' || user_id <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (!order_total || typeof order_total !== 'number' || order_total <= 0) {
    return res.status(400).json({ error: 'Invalid order total' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO orders (user_id, order_total) VALUES ($1, $2) RETURNING order_id',
      [user_id, order_total]
    );
    res.status(201).json({
      message: 'Order created',
      order_id: result.rows[0].order_id
    });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'User does not exist' });
    }
    handleDatabaseError(err, res);
  }
});

app.get('/users/:id/orders', async (req, res) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    
    const userCheck = await pool.query(
      'SELECT 1 FROM users WHERE user_id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await pool.query(
      `SELECT o.order_id, o.order_total, o.created_at, 
              u.name as user_name, u.email as user_email
       FROM orders o
       JOIN users u ON o.user_id = u.user_id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

app.get('/orders', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.order_id, o.order_total, o.created_at,
              u.user_id, u.name as user_name, u.email as user_email
       FROM orders o
       JOIN users u ON o.user_id = u.user_id
       ORDER BY o.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    handleDatabaseError(err, res);
  }
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
  console.log('Closing HTTP server.');
  server.close(() => {
    console.log('HTTP server closed.');
    pool.end(() => {
      console.log('Database pool closed.');
      process.exit(0);
    });
  });
});