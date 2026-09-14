require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pool = require('./db');
const { subscribe, broadcast } = require('./realtime');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '200kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

function adminOnly(req, res, next) {
  const supplied = req.get('x-admin-key');
  if (!process.env.ADMIN_API_KEY || supplied !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Chave administrativa inválida.' });
  }
  next();
}

function cleanText(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function promotionPayload(body) {
  const item = {
    product_name: cleanText(body.product_name, 180),
    category: cleanText(body.category, 80),
    brand: cleanText(body.brand, 100) || null,
    description: cleanText(body.description, 500) || null,
    image_url: cleanText(body.image_url, 500) || null,
    original_price: Number(body.original_price),
    promotional_price: Number(body.promotional_price),
    store_id: Number(body.store_id),
    product_url: cleanText(body.product_url, 500) || null,
    starts_at: body.starts_at,
    ends_at: body.ends_at,
    active: body.active === false || body.active === 0 ? 0 : 1
  };
  if (!item.product_name || !item.category || !item.store_id || !item.starts_at || !item.ends_at) {
    throw new Error('Preencha os campos obrigatórios.');
  }
  if (!(item.original_price > 0) || !(item.promotional_price > 0) || item.promotional_price > item.original_price) {
    throw new Error('Os preços informados são inválidos.');
  }
  if (new Date(item.ends_at) <= new Date(item.starts_at)) {
    throw new Error('O término deve ocorrer depois do início.');
  }
  return item;
}

app.get('/api/health', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) { next(error); }
});

app.get('/api/events', subscribe);

app.get('/api/stores', async (_req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, name, city, state FROM stores ORDER BY name');
    res.json(rows);
  } catch (error) { next(error); }
});

app.post('/api/stores', adminOnly, async (req, res, next) => {
  try {
    const name = cleanText(req.body.name, 120);
    const city = cleanText(req.body.city, 100);
    const state = cleanText(req.body.state, 2).toUpperCase();
    if (!name || !city || state.length !== 2) return res.status(400).json({ error: 'Dados da loja inválidos.' });
    const [result] = await pool.execute('INSERT INTO stores (name, city, state) VALUES (?, ?, ?)', [name, city, state]);
    broadcast('stores-updated');
    res.status(201).json({ id: result.insertId, name, city, state });
  } catch (error) { next(error); }
});

app.get('/api/promotions', async (req, res, next) => {
  try {
    const search = cleanText(req.query.search, 120);
    const category = cleanText(req.query.category, 80);
    const storeId = Number(req.query.store_id || 0);
    const sortMap = {
      price_asc: 'p.promotional_price ASC',
      discount_desc: 'discount_percent DESC',
      newest: 'p.created_at DESC'
    };
    const orderBy = sortMap[req.query.sort] || sortMap.discount_desc;
    const where = ['p.active = 1', 'p.starts_at <= NOW()', 'p.ends_at > NOW()'];
    const params = [];
    if (search) {
      where.push('(p.product_name LIKE ? OR p.brand LIKE ? OR p.description LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (category) { where.push('p.category = ?'); params.push(category); }
    if (storeId) { where.push('p.store_id = ?'); params.push(storeId); }

    const sql = `SELECT p.*, s.name AS store_name, s.city, s.state,
      ROUND((1 - p.promotional_price / p.original_price) * 100) AS discount_percent
      FROM promotions p JOIN stores s ON s.id = p.store_id
      WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT 200`;
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (error) { next(error); }
});

app.get('/api/admin/promotions', adminOnly, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT p.*, s.name AS store_name,
      ROUND((1 - p.promotional_price / p.original_price) * 100) AS discount_percent
      FROM promotions p JOIN stores s ON s.id=p.store_id ORDER BY p.created_at DESC LIMIT 500`);
    res.json(rows);
  } catch (error) { next(error); }
});

app.post('/api/promotions', adminOnly, async (req, res, next) => {
  try {
    const p = promotionPayload(req.body);
    const [result] = await pool.execute(
      `INSERT INTO promotions
      (product_name, category, brand, description, image_url, original_price, promotional_price, store_id, product_url, starts_at, ends_at, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      Object.values(p)
    );
    broadcast();
    res.status(201).json({ id: result.insertId, ...p });
  } catch (error) {
    if (error.message.includes('Preencha') || error.message.includes('preços') || error.message.includes('término')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

app.put('/api/promotions/:id', adminOnly, async (req, res, next) => {
  try {
    const p = promotionPayload(req.body);
    const values = Object.values(p);
    values.push(Number(req.params.id));
    const [result] = await pool.execute(
      `UPDATE promotions SET product_name=?, category=?, brand=?, description=?, image_url=?,
      original_price=?, promotional_price=?, store_id=?, product_url=?, starts_at=?, ends_at=?, active=? WHERE id=?`,
      values
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Promoção não encontrada.' });
    broadcast();
    res.json({ id: Number(req.params.id), ...p });
  } catch (error) { next(error); }
});

app.patch('/api/promotions/:id/status', adminOnly, async (req, res, next) => {
  try {
    const [result] = await pool.execute('UPDATE promotions SET active=? WHERE id=?', [req.body.active ? 1 : 0, Number(req.params.id)]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Promoção não encontrada.' });
    broadcast();
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.delete('/api/promotions/:id', adminOnly, async (req, res, next) => {
  try {
    const [result] = await pool.execute('DELETE FROM promotions WHERE id=?', [Number(req.params.id)]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Promoção não encontrada.' });
    broadcast();
    res.status(204).end();
  } catch (error) { next(error); }
});

app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'admin.html')));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Não foi possível concluir a operação.' });
});

app.listen(port, () => console.log(`Pesquisa de Preços disponível em http://localhost:${port}`));
