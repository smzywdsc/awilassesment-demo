const express = require('express');
const path = require('path');
const mysql = require('mysql2');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 数据库连接配置
const db = mysql.createConnection({
  host: 'localhost',
  port: 3306, 
  user: 'root',
  password: '12345Wxz',
  database: 'tool_set',
  charset: 'utf8mb4'
});

// 首页路由
app.get('/', (req, res) => {
  // 查询所有主题
  db.query('SELECT id, name FROM theme', (err, results) => {
    if (err) return res.status(500).send('数据库错误');
    res.render('index', { themes: results });
  });
});

// 查询子主题
app.get('/api/subthemes', (req, res) => {
  const themeId = req.query.themeId;
  db.query('SELECT id, name FROM subtheme WHERE theme_id = ?', [themeId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// 查询分类
app.get('/api/categories', (req, res) => {
  const subthemeId = req.query.subthemeId;
  db.query('SELECT id, name FROM category WHERE subtheme_id = ?', [subthemeId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// 随机获取名字 & 总数
app.get('/api/random-name', (req, res) => {
    const categoryId = req.query.categoryId;
    // 查询总数
    db.query('SELECT COUNT(*) as cnt FROM name_category WHERE category_id=?', [categoryId], (err, cntRes) => {
        if (err) return res.status(500).json({ error: err.message });
        const count = cntRes[0].cnt;
        if (count === 0) return res.json({ name: null, count: 0 });
        // 随机选一个名字
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

const session = require('express-session');

// session配置
app.use(session({
    secret: 'your-secret-key', // 随意填写
    resave: false,
    saveUninitialized: true
}));

// 登录页
app.get('/admin/login', (req, res) => {
    res.render('admin_login', { error: '' });
});

// 登录提交
app.post('/admin/login', express.urlencoded({ extended: true }), (req, res) => {
    const { username, password } = req.body;
    if (username === 'apple' && password === 'apple') {
        req.session.isAdmin = true;
        res.redirect('/admin/table');
    } else {
        res.render('admin_login', { error: 'Invalid username or password.' });
    }
});

// 登出
app.get('/admin/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin/login');
    });
});

// 后台管理页（需要登录）
app.get('/admin/table', (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin/login');
    // 查询所有数据（可自定义复杂查询）
    db.query(`
        SELECT n.id as name_id, n.name_text, t.name as theme, st.name as subtheme, c.name as category
        FROM name n
        LEFT JOIN name_category nc ON n.id=nc.name_id
        LEFT JOIN category c ON nc.category_id=c.id
        LEFT JOIN subtheme st ON c.subtheme_id=st.id
        LEFT JOIN theme t ON st.theme_id=t.id
    `, (err, results) => {
        if (err) return res.status(500).send('Database Error');
        res.render('admin_table', { data: results });
    });
});

// 后台可视化页（需要登录）
app.get('/admin/chart', (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin/login');
    // 查询分类下名字数量分布
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

app.post('/admin/add', (req, res) => {
  if (!req.session.isAdmin) return res.status(401).json({success:false, message:"Not logged in"});
  const { type, data } = req.body;

  let sql = '', params = [];
  if (type === 'theme') {
    sql = 'INSERT INTO theme (name) VALUES (?)';
    params = [data.theme];
  } else if (type === 'subtheme') {
    // 先查theme_id
    db.query('SELECT id FROM theme WHERE name=?', [data.theme], (err, result) => {
      if (err || !result.length) return res.json({success:false, message:'Theme not found'});
      sql = 'INSERT INTO subtheme (name, theme_id) VALUES (?, ?)';
      params = [data.subtheme, result[0].id];
      db.query(sql, params, (err2) => {
        if (err2) return res.json({success:false, message:'DB error'});
        res.json({success:true});
      });
    });
    return;
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
    return;
  } else if (type === 'name') {
    sql = 'INSERT INTO name (name_text) VALUES (?)';
    params = [data.name];
  } else {
    return res.json({success:false, message:'Unknown type'});
  }
  db.query(sql, params, (err) => {
    if (err) return res.json({success:false, message:'DB error'});
    res.json({success:true});
  });
});

// 删除（假设只删除 name_category 关联，不物理删除 name/category 等主表）
app.post('/admin/delete', (req, res) => {
  if (!req.session.isAdmin) return res.status(401).json({success:false});
  const { name, theme, subtheme, category } = req.body;
  // 查找各个id
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

// 编辑
app.post('/admin/edit', (req, res) => {
  if (!req.session.isAdmin) return res.status(401).json({success:false});
  const { old, updated } = req.body;
  // 这里只演示编辑 name_text
  db.query('UPDATE name SET name_text=? WHERE name_text=?', [updated.name, old.name], (err) => {
    if (err) return res.json({success:false, message:'DB error'});
    res.json({success:true});
  });
});

app.get('/admin/assign', (req, res) => {
  if (!req.session.isAdmin) return res.redirect('/admin/login');

  // 查询所有 name
  db.query('SELECT id, name_text FROM name ORDER BY name_text', (err, names) => {
    if (err) return res.status(500).send('DB error');
    // 查询所有 category 及完整路径（theme-subtheme-category）
    const catSql = `
      SELECT c.id, t.name AS theme, st.name AS subtheme, c.name AS category
      FROM category c
      JOIN subtheme st ON c.subtheme_id=st.id
      JOIN theme t ON st.theme_id=t.id
      ORDER BY t.name, st.name, c.name
    `;
    db.query(catSql, (err2, categories) => {
      if (err2) return res.status(500).send('DB error');
      // 查询所有已有分配关系
      db.query('SELECT * FROM name_category', (err3, ncs) => {
        if (err3) return res.status(500).send('DB error');
        res.render('assign_matrix', { names, categories, ncs });
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

app.listen(3000, () => {
  console.log('Server started at http://localhost:3000');
});
