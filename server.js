const express = require('express');
const path = require('path');
const mysql = require('mysql2');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[VISIT] ${req.ip} ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  charset: 'utf8mb4'
});

const session = require('express-session');
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

// ----------------- Public Portal APIs -----------------
app.get('/', (req, res) => {
  db.query('SELECT id, name FROM theme', (err, results) => {
    if (err) return res.status(500).send('Database error');
    res.render('index', { themes: results });
  });
});

app.get('/api/subthemes', (req, res) => {
  const themeId = req.query.themeId;
  db.query('SELECT id, name FROM subtheme WHERE theme_id = ?', [themeId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get('/api/categories', (req, res) => {
  const subthemeId = req.query.subthemeId;
  db.query('SELECT id, name FROM category WHERE subtheme_id = ?', [subthemeId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get('/api/random-name', (req, res) => {
  const categoryId = req.query.categoryId;
  db.query('SELECT COUNT(*) as cnt FROM name_category WHERE category_id=?', [categoryId], (err, cntRes) => {
    if (err) return res.status(500).json({ error: err.message });
    const count = cntRes[0].cnt;
    if (count === 0) return res.json({ name: null, count: 0 });
    db.query(
      `SELECT n.name_text FROM name n
       JOIN name_category nc ON n.id = nc.name_id
       WHERE nc.category_id=?
       ORDER BY RAND() LIMIT 1`,
      [categoryId],
      (err2, nameRes) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ name: nameRes[0].name_text, count });
      }
    );
  });
});

// ------------------- Admin Portal & Auth -------------------
app.get('/admin/login', (req, res) => {
  res.render('admin_login', { error: '' });
});
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'apple' && password === 'apple') {
    req.session.isAdmin = true;
    res.redirect('/admin/table');
  } else {
    res.render('admin_login', { error: 'Invalid username or password.' });
  }
});
app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// Helper: group all themes, subthemes, and categories, even if empty
function groupCategoriesAll(themes, subthemes, categories) {
  return themes.map(theme => {
    const themeSubs = subthemes.filter(st => st.theme_id === theme.id);
    return {
      theme: theme.name,
      subthemes: themeSubs.length > 0 ? themeSubs.map(st => ({
        subtheme: st.name,
        categories: categories.filter(cat => cat.subtheme_id === st.id)
                              .map(cat => ({ id: cat.id, category: cat.name }))
      })) : []
    };
  });
}

// ----------- Main Matrix Management (shows all themes immediately) ----------
app.get('/admin/table', (req, res) => {
  if (!req.session.isAdmin) return res.redirect('/admin/login');
  db.query('SELECT id, name_text FROM name ORDER BY CAST(name_text AS UNSIGNED), name_text', (err, names) => {
    if (err) return res.status(500).send('DB error');
    db.query('SELECT id, name FROM theme ORDER BY id', (err1, themes) => {
      if (err1) return res.status(500).send('DB error');
      db.query('SELECT id, name, theme_id FROM subtheme ORDER BY id', (err2, subthemes) => {
        if (err2) return res.status(500).send('DB error');
        db.query('SELECT id, name, subtheme_id FROM category ORDER BY id', (err3, categories) => {
          if (err3) return res.status(500).send('DB error');
          db.query('SELECT * FROM name_category', (err4, ncs) => {
            if (err4) return res.status(500).send('DB error');
            const categoriesGroup = groupCategoriesAll(themes, subthemes, categories);
            res.render('admin_table', { names, ncs, categoriesGroup });
          });
        });
      });
    });
  });
});

// ------------------- Data Visualization -------------------
app.get('/admin/chart', (req, res) => {
  if (!req.session.isAdmin) return res.redirect('/admin/login');
  db.query(`
      SELECT t.name AS theme, st.name AS subtheme, c.name AS category, COUNT(nc.name_id) as count
      FROM category c
      LEFT JOIN subtheme st ON c.subtheme_id=st.id
      LEFT JOIN theme t ON st.theme_id=t.id
      LEFT JOIN name_category nc ON c.id=nc.category_id
      GROUP BY c.id
  `, (err, results) => {
      if (err) return res.status(500).send('Database Error');
      res.render('admin_chart', { chartData: results });
  });
});

// --------- Add theme, subtheme, category, or name ----------
app.post('/admin/add', (req, res) => {
  if (!req.session.isAdmin) return res.status(401).json({success:false, message:"Not logged in"});
  const { type, data } = req.body;
  let sql = '', params = [];
  if (type === 'theme') {
    sql = 'INSERT INTO theme (name) VALUES (?)';
    params = [data.theme];
    db.query(sql, params, (err) => {
      if (err) return res.json({success:false, message:'DB error'});
      res.json({success:true});
    });
  } else if (type === 'subtheme') {
    db.query('SELECT id FROM theme WHERE name=?', [data.theme], (err, result) => {
      if (err || !result.length) return res.json({success:false, message:'Theme not found'});
      sql = 'INSERT INTO subtheme (name, theme_id) VALUES (?, ?)';
      params = [data.subtheme, result[0].id];
      db.query(sql, params, (err2) => {
        if (err2) return res.json({success:false, message:'DB error'});
        res.json({success:true});
      });
    });
  } else if (type === 'category') {
    db.query('SELECT id FROM subtheme WHERE name=?', [data.subtheme], (err, result) => {
      if (err || !result.length) return res.json({success:false, message:'Subtheme not found'});
      sql = 'INSERT INTO category (name, subtheme_id) VALUES (?, ?)';
      params = [data.category, result[0].id];
      db.query(sql, params, (err2) => {
        if (err2) return res.json({success:false, message:'DB error'});
        res.json({success:true});
      });
    });
  } else if (type === 'name') {
    sql = 'INSERT INTO name (name_text) VALUES (?)';
    params = [data.name];
    db.query(sql, params, (err) => {
      if (err) return res.json({success:false, message:'DB error'});
      res.json({success:true});
    });
  } else {
    return res.json({success:false, message:'Unknown type'});
  }
});

// -------------- Delete mapping or name ---------------
app.post('/admin/delete', (req, res) => {
  if (!req.session.isAdmin) return res.status(401).json({success:false});
  const { name, theme, subtheme, category } = req.body;
  db.query(
    `SELECT n.id as name_id, c.id as category_id
     FROM name n
     JOIN name_category nc ON nc.name_id=n.id
     JOIN category c ON nc.category_id=c.id
     JOIN subtheme st ON c.subtheme_id=st.id
     JOIN theme t ON st.theme_id=t.id
     WHERE n.name_text=? AND c.name=? AND st.name=? AND t.name=?`,
    [name, category, subtheme, theme],
    (err, rows) => {
      if (err || !rows.length) return res.json({success:false, message:'Record not found'});
      db.query('DELETE FROM name_category WHERE name_id=? AND category_id=?', [rows[0].name_id, rows[0].category_id], (err2) => {
        if (err2) return res.json({success:false, message:'DB error'});
        res.json({success:true});
      });
    }
  );
});
app.post('/admin/delete-name', (req, res) => {
  if (!req.session.isAdmin) return res.status(401).json({success:false});
  const { name } = req.body;
  db.query('SELECT id FROM name WHERE name_text=?', [name], (err, rows) => {
    if (err || !rows.length) return res.json({success:false, message:'Name not found'});
    const nameId = rows[0].id;
    db.query('DELETE FROM name_category WHERE name_id=?', [nameId], (err2) => {
      if (err2) return res.json({success:false, message:'Delete mapping error'});
      db.query('DELETE FROM name WHERE id=?', [nameId], (err3) => {
        if (err3) return res.json({success:false, message:'Delete name error'});
        res.json({success:true});
      });
    });
  });
});
app.post('/admin/assign-x', (req, res) => {
  if (!req.session.isAdmin) return res.status(401).json({success:false});
  const { name_id, category_id, action } = req.body;
  if (action === 'add') {
    db.query('INSERT IGNORE INTO name_category (name_id, category_id) VALUES (?, ?)', [name_id, category_id], err => {
      if (err) return res.json({success:false, message:'DB error'});
      res.json({success:true});
    });
  } else if (action === 'remove') {
    db.query('DELETE FROM name_category WHERE name_id=? AND category_id=?', [name_id, category_id], err => {
      if (err) return res.json({success:false, message:'DB error'});
      res.json({success:true});
    });
  } else {
    res.json({success:false, message:'Invalid action'});
  }
});

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
