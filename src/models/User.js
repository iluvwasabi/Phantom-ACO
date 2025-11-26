const db = require('../config/database');

class User {
  static findById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  static findByDiscordId(discordId) {
    return db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId);
  }

  static create(userData) {
    const stmt = db.prepare(`
      INSERT INTO users (discord_id, discord_username, discord_discriminator, discord_avatar, email)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userData.discord_id,
      userData.discord_username,
      userData.discord_discriminator,
      userData.discord_avatar,
      userData.email
    );

    return this.findById(result.lastInsertRowid);
  }

  static update(id, userData) {
    const stmt = db.prepare(`
      UPDATE users
      SET discord_username = ?,
          discord_discriminator = ?,
          discord_avatar = ?,
          email = ?,
          last_login = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      userData.discord_username,
      userData.discord_discriminator,
      userData.discord_avatar,
      userData.email,
      id
    );

    return this.findById(id);
  }

  static verifyUser(id) {
    const stmt = db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?');
    stmt.run(id);
  }

  static getSubscriptions(userId) {
    return db.prepare(`
      SELECT * FROM service_subscriptions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);
  }

  static getFormSubmissions(userId) {
    return db.prepare(`
      SELECT * FROM form_submissions
      WHERE user_id = ?
      ORDER BY submission_time DESC
    `).all(userId);
  }
}

module.exports = User;
