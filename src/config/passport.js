const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const db = require('./database');

passport.serializeUser((user, done) => {
  // Store both user ID and guilds in session
  done(null, { id: user.id, guilds: user.guilds });
});

passport.deserializeUser((obj, done) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(obj.id);
    // Restore guilds from session
    user.guilds = obj.guilds;
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify', 'email', 'guilds']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists
      let user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(profile.id);

      const userData = {
        discord_id: profile.id,
        discord_username: profile.username,
        discord_discriminator: profile.discriminator,
        discord_avatar: profile.avatar,
        email: profile.email,
        last_login: new Date().toISOString()
      };

      if (user) {
        // Update existing user
        const updateStmt = db.prepare(`
          UPDATE users
          SET discord_username = ?,
              discord_discriminator = ?,
              discord_avatar = ?,
              email = ?,
              last_login = ?
          WHERE discord_id = ?
        `);

        updateStmt.run(
          userData.discord_username,
          userData.discord_discriminator,
          userData.discord_avatar,
          userData.email,
          userData.last_login,
          userData.discord_id
        );

        user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(profile.id);
      } else {
        // Create new user
        const insertStmt = db.prepare(`
          INSERT INTO users (discord_id, discord_username, discord_discriminator, discord_avatar, email, last_login)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = insertStmt.run(
          userData.discord_id,
          userData.discord_username,
          userData.discord_discriminator,
          userData.discord_avatar,
          userData.email,
          userData.last_login
        );

        user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      }

      // Store guilds for verification
      user.guilds = profile.guilds;

      return done(null, user);
    } catch (error) {
      console.error('Error in Discord strategy:', error);
      return done(error, null);
    }
  }
));

module.exports = passport;
