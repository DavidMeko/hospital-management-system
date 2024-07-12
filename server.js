const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// הדפסת ערכי משתני הסביבה לצורכי דיבוג
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PASSWORD is set:', !!process.env.DB_PASSWORD);

// יצירת מאגר חיבורים למסד הנתונים
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// נתיב בסיסי
app.get('/', (req, res) => {
  res.json({ message: 'ברוכים הבאים ל-API של מערכת ניהול בית החולים' });
});

// נתיבי עובדים

// קבלת כל העובדים
app.get('/api/employees', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees');
    res.json(rows);
  } catch (error) {
    console.error('שגיאה בקבלת העובדים:', error);
    res.status(500).json({ error: 'שגיאה פנימית בשרת' });
  }
});

// קבלת עובד ספציפי
app.get('/api/employees/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees WHERE employee_id = ?', [req.params.id]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: 'העובד לא נמצא' });
    }
  } catch (error) {
    console.error('שגיאה בקבלת העובד:', error);
    res.status(500).json({ error: 'שגיאה פנימית בשרת' });
  }
});

// הוספת עובד חדש
app.post('/api/employees', async (req, res) => {
  try {
    const { first_name, last_name, email, phone_number, salary } = req.body;
    const [result] = await pool.query(
      'INSERT INTO employees (first_name, last_name, email, phone_number, salary) VALUES (?, ?, ?, ?, ?)',
      [first_name, last_name, email, phone_number, salary]
    );
    res.status(201).json({ id: result.insertId, message: 'העובד נוסף בהצלחה' });
  } catch (error) {
    console.error('שגיאה בהוספת עובד:', error);
    res.status(500).json({ error: 'שגיאה פנימית בשרת' });
  }
});

// עדכון עובד קיים
app.put('/api/employees/:id', async (req, res) => {
  try {
    const { first_name, last_name, email, phone_number, salary } = req.body;
    const [result] = await pool.query(
      'UPDATE employees SET first_name = ?, last_name = ?, email = ?, phone_number = ?, salary = ? WHERE employee_id = ?',
      [first_name, last_name, email, phone_number, salary, req.params.id]
    );
    if (result.affectedRows > 0) {
      res.json({ message: 'העובד עודכן בהצלחה' });
    } else {
      res.status(404).json({ message: 'העובד לא נמצא' });
    }
  } catch (error) {
    console.error('שגיאה בעדכון העובד:', error);
    res.status(500).json({ error: 'שגיאה פנימית בשרת' });
  }
});

// מחיקת עובד
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM employees WHERE employee_id = ?', [req.params.id]);
    if (result.affectedRows > 0) {
      res.json({ message: 'העובד נמחק בהצלחה' });
    } else {
      res.status(404).json({ message: 'העובד לא נמצא' });
    }
  } catch (error) {
    console.error('שגיאה במחיקת העובד:', error);
    res.status(500).json({ error: 'שגיאה פנימית בשרת' });
  }
});

// נתיבי מחלקות

// קבלת כל המחלקות
app.get('/api/departments', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM departments');
    res.json(rows);
  } catch (error) {
    console.error('שגיאה בקבלת המחלקות:', error);
    res.status(500).json({ error: 'שגיאה פנימית בשרת' });
  }
});

// קבלת מחלקה ספציפית
app.get('/api/departments/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM departments WHERE department_id = ?', [req.params.id]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: 'המחלקה לא נמצאה' });
    }
  } catch (error) {
    console.error('שגיאה בקבלת המחלקה:', error);
    res.status(500).json({ error: 'שגיאה פנימית בשרת' });
  }
});

// סטטיסטיקות מחלקות
app.get('/api/departments/statistics', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        d.department_id,
        d.department_name,
        COUNT(e.employee_id) as employee_count,
        AVG(e.salary) as average_salary
      FROM departments d
      LEFT JOIN employees e ON d.department_id = e.department_id
      GROUP BY d.department_id
    `);
    res.json(rows);
  } catch (error) {
    console.error('שגיאה בקבלת סטטיסטיקות המחלקות:', error);
    res.status(500).json({ error: 'שגיאה פנימית בשרת' });
  }
});

// התפלגות שכר
app.get('/api/employees/salary-distribution', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        CASE
          WHEN salary < 50000 THEN 'Below 50k'
          WHEN salary BETWEEN 50000 AND 100000 THEN '50k-100k'
          WHEN salary BETWEEN 100001 AND 150000 THEN '100k-150k'
          ELSE 'Above 150k'
        END AS salary_range,
        COUNT(*) as employee_count
      FROM employees
      GROUP BY salary_range
    `);
    res.json(rows);
  } catch (error) {
    console.error('שגיאה בקבלת התפלגות השכר:', error);
    res.status(500).json({ error: 'שגיאה פנימית בשרת' });
  }
});

const PORT = process.env.PORT || 3000;

function startServer(port) {
  app.listen(port, () => {
    console.log(`השרת פועל על פורט ${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`הפורט ${port} תפוס, מנסה עם פורט ${port + 1}`);
      startServer(port + 1);
    } else {
      console.error('שגיאה בהפעלת השרת:', err);
    }
  });
}

startServer(PORT);