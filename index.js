const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Change database connection config
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'buggy_db',
  port: 3306,
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Connected to the database');
  }
});

app.get('/users', (req, res) => {
  const sql = 'SELECT userd_id, name, email FROM users';

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

app.post('/orders', (req, res) => {
  const { user_id, order_total } = req.body;

  if (!user_id || !order_total) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const sql = `INSERT INTO orders (user_id, order_total) VALUES (${user_id}, ${order_total})`;

  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Order created', order_id: result.insertId });
  });
});

app.get('/users/:id/orders', (req, res) => {
  const userId = req.params.id;

  const sql = `SELECT o.order_id, o.order_total, u.name
               FROM orders o
               LEFT JOIN users u ON o.user_id = u.user_id
               WHERE o.user_id = ?`;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

app.put('/users/:id', (req, res) => {
  const userId = req.params.id;
  const { name, email } = req.body;

  const sql = `UPDATE users SET name = ?, email = ? WHERE user_id = ?`;

  db.query(sql, [name, email, userId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'User updated' });
  });
});

app.delete('/users/:id', (req, res) => {
  const userId = req.params.id;

  const sql = `DELETE FROM users WHERE user_id = ?`;

  db.query(sql, [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'User deleted' });
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});