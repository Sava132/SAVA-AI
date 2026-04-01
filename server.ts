import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";
import session from "express-session";
import { fileURLToPath } from "url";
import crypto from "crypto";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("sava_ai.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    googleId TEXT UNIQUE,
    name TEXT,
    learningStyle TEXT DEFAULT 'text-based',
    responseTone TEXT DEFAULT 'friendly',
    avatar TEXT
  );
  CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    userId TEXT,
    type TEXT,
    targetId TEXT,
    title TEXT,
    FOREIGN KEY(userId) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    userId TEXT,
    title TEXT,
    createdAt INTEGER,
    FOREIGN KEY(userId) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chatId TEXT,
    userId TEXT,
    role TEXT,
    content TEXT,
    timestamp INTEGER,
    type TEXT,
    FOREIGN KEY(chatId) REFERENCES chats(id),
    FOREIGN KEY(userId) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "sava-ai-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        httpOnly: true,
      },
    }),
  );

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    if (req.session.userId) {
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  };

  // Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    try {
      db.prepare(
        "INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)",
      ).run(id, email, hashedPassword, name);
      req.session.userId = id;
      res.json({ success: true, user: { id, email, name } });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user: any = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email);
    if (
      user &&
      user.password &&
      (await bcrypt.compare(password, user.password))
    ) {
      req.session.userId = user.id;
      res.json({ success: true, user });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", (req: any, res) => {
    if (req.session.userId) {
      const user = db
        .prepare(
          "SELECT id, email, name, avatar, learningStyle, responseTone FROM users WHERE id = ?",
        )
        .get(req.session.userId);
      res.json(user);
    } else {
      res.status(401).json({ error: "Not logged in" });
    }
  });

  // Google OAuth URL
  app.get("/api/auth/google/url", (req, res) => {
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.APP_URL || "http://localhost:3000"}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    res.json({ url: authUrl });
  });

  // Google OAuth Callback
  app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.APP_URL || "http://localhost:3000"}/api/auth/google/callback`;

    try {
      // Exchange code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokens = await tokenRes.json();

      // Get user info
      const userRes = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        },
      );
      const googleUser = await userRes.json();

      let user: any = db
        .prepare("SELECT * FROM users WHERE googleId = ? OR email = ?")
        .get(googleUser.sub, googleUser.email);

      if (!user) {
        const id = crypto.randomUUID();
        db.prepare(
          "INSERT INTO users (id, email, googleId, name, avatar) VALUES (?, ?, ?, ?, ?)",
        ).run(
          id,
          googleUser.email,
          googleUser.sub,
          googleUser.name,
          googleUser.picture,
        );
        user = {
          id,
          email: googleUser.email,
          name: googleUser.name,
          avatar: googleUser.picture,
        };
      } else if (!user.googleId) {
        db.prepare(
          "UPDATE users SET googleId = ?, avatar = ? WHERE id = ?",
        ).run(googleUser.sub, googleUser.picture, user.id);
      }

      req.session.userId = user.id;

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (e) {
      console.error(e);
      res.status(500).send("Authentication failed");
    }
  });

  // User Profile
  app.post("/api/profile", authenticate, (req: any, res) => {
    const { name, learningStyle, responseTone, avatar } = req.body;
    db.prepare(
      "UPDATE users SET name = ?, learningStyle = ?, responseTone = ?, avatar = ? WHERE id = ?",
    ).run(name, learningStyle, responseTone, avatar, req.session.userId);
    res.json({ success: true });
  });

  app.post("/api/profile/password", authenticate, async (req: any, res) => {
    const { password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(
      hashedPassword,
      req.session.userId,
    );
    res.json({ success: true });
  });

  // Favorites
  app.get("/api/favorites", authenticate, (req: any, res) => {
    const favorites = db
      .prepare("SELECT * FROM favorites WHERE userId = ?")
      .all(req.session.userId);
    res.json(favorites);
  });

  app.post("/api/favorites", authenticate, (req: any, res) => {
    const { id, type, targetId, title } = req.body;
    db.prepare(
      "INSERT INTO favorites (id, userId, type, targetId, title) VALUES (?, ?, ?, ?, ?)",
    ).run(id, req.session.userId, type, targetId, title);
    res.json({ success: true });
  });

  app.delete("/api/favorites/:id", authenticate, (req: any, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM favorites WHERE id = ? AND userId = ?").run(
      id,
      req.session.userId,
    );
    res.json({ success: true });
  });

  // API Routes
  app.get("/api/chats", authenticate, (req: any, res) => {
    const chats = db
      .prepare("SELECT * FROM chats WHERE userId = ? ORDER BY createdAt DESC")
      .all(req.session.userId);
    res.json(chats);
  });

  app.post("/api/chats", authenticate, (req: any, res) => {
    const { id, title, createdAt } = req.body;
    db.prepare(
      "INSERT INTO chats (id, userId, title, createdAt) VALUES (?, ?, ?, ?)",
    ).run(id, req.session.userId, title, createdAt);
    res.json({ success: true });
  });

  app.post("/api/chats/:id/title", authenticate, (req: any, res) => {
    const { id } = req.params;
    const { title } = req.body;
    db.prepare("UPDATE chats SET title = ? WHERE id = ? AND userId = ?").run(
      title,
      id,
      req.session.userId,
    );
    res.json({ success: true });
  });

  app.delete("/api/chats/:id", authenticate, (req: any, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM messages WHERE chatId = ? AND userId = ?").run(
      id,
      req.session.userId,
    );
    db.prepare("DELETE FROM chats WHERE id = ? AND userId = ?").run(
      id,
      req.session.userId,
    );
    res.json({ success: true });
  });

  app.get("/api/messages/:chatId", authenticate, (req: any, res) => {
    const { chatId } = req.params;
    const messages = db
      .prepare(
        "SELECT * FROM messages WHERE chatId = ? AND userId = ? ORDER BY timestamp ASC",
      )
      .all(chatId, req.session.userId);
    res.json(messages);
  });

  app.post("/api/messages", authenticate, (req: any, res) => {
    const { id, chatId, role, content, timestamp, type } = req.body;
    db.prepare(
      "INSERT INTO messages (id, chatId, userId, role, content, timestamp, type) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(id, chatId, req.session.userId, role, content, timestamp, type);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
