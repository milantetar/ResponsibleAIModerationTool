const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, 'moderation.db'));
    this.init();
  }

  init() {
    // Users table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
      )
    `);

    // Moderation logs table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS moderation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        content TEXT NOT NULL,
        result TEXT NOT NULL,
        flagged BOOLEAN DEFAULT 0,
        confidence REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // User feedback table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        moderation_log_id INTEGER NOT NULL,
        user_id INTEGER,
        feedback_type TEXT NOT NULL,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (moderation_log_id) REFERENCES moderation_logs (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);
  }

  // User methods
  createUser(email, hashedPassword) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO users (email, password) VALUES (?, ?)',
        [email, hashedPassword],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, email });
        }
      );
    });
  }

  getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  getUserById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT id, email, created_at FROM users WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // Moderation log methods
  logModeration(userId, content, result, flagged, confidence) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO moderation_logs (user_id, content, result, flagged, confidence) VALUES (?, ?, ?, ?, ?)',
        [userId, content, JSON.stringify(result), flagged, confidence],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  }

  getModerationStats(userId = null) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT 
          COUNT(*) as total_scans,
          SUM(CASE WHEN flagged = 1 THEN 1 ELSE 0 END) as flagged_content,
          AVG(confidence) as avg_confidence,
          DATE(created_at) as date
        FROM moderation_logs
      `;
      
      const params = [];
      if (userId) {
        query += ' WHERE user_id = ?';
        params.push(userId);
      }
      
      query += ' GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30';

      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Feedback methods
  addFeedback(moderationLogId, userId, feedbackType, comment) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO user_feedback (moderation_log_id, user_id, feedback_type, comment) VALUES (?, ?, ?, ?)',
        [moderationLogId, userId, feedbackType, comment],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  }
}

module.exports = new Database();