require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initFirebase } = require('./firebase');

// Initialize Firebase
initFirebase();

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
});

// Middleware
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// In-memory live session store (for real-time monitor)
// { sessionId: { username, examId, examTitle, currentQuestion, totalQuestions, cheatCount, socketId } }
const liveUsers = {};

// Make io and liveUsers accessible to routes
app.set('io', io);
app.set('liveUsers', liveUsers);

// Routes
const examsRouter = require('./routes/exams');
const sessionsRouter = require('./routes/sessions');
const resultsRouter = require('./routes/results');

app.use('/api/exams', examsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/results', resultsRouter);

// Admin auth endpoint
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'killayda_admin_2024';
  if (password === adminPassword) {
    res.json({ success: true, token: 'admin-authenticated' });
  } else {
    res.status(401).json({ success: false, message: 'Şifre hatalı!' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Admin joins admin room to receive all broadcasts
  socket.on('join:admin', () => {
    socket.join('admin-room');
    console.log(`👑 Admin joined admin-room`);
    // Send current live users snapshot
    socket.emit('live:snapshot', Object.values(liveUsers));
  });

  // User starts / resumes exam
  socket.on('user:join', (data) => {
    // data: { sessionId, username, examId, examTitle, currentQuestion, totalQuestions }
    liveUsers[data.sessionId] = {
      ...data,
      socketId: socket.id,
      cheatCount: liveUsers[data.sessionId]?.cheatCount || 0,
      lastSeen: new Date().toISOString(),
    };
    socket.join(`session:${data.sessionId}`);
    // Broadcast to admin
    io.to('admin-room').emit('live:update', liveUsers[data.sessionId]);
    console.log(`👤 User joined: ${data.username} on exam ${data.examTitle}`);
  });

  // User advances question
  socket.on('user:progress', (data) => {
    // data: { sessionId, currentQuestion }
    if (liveUsers[data.sessionId]) {
      liveUsers[data.sessionId].currentQuestion = data.currentQuestion;
      liveUsers[data.sessionId].lastSeen = new Date().toISOString();
      io.to('admin-room').emit('live:update', liveUsers[data.sessionId]);
    }
  });

  // Cheat / focus lost event
  socket.on('user:cheat', (data) => {
    // data: { sessionId, username, examTitle, type }
    if (liveUsers[data.sessionId]) {
      liveUsers[data.sessionId].cheatCount = (liveUsers[data.sessionId].cheatCount || 0) + 1;
      liveUsers[data.sessionId].lastSeen = new Date().toISOString();
      io.to('admin-room').emit('live:cheat', {
        ...liveUsers[data.sessionId],
        cheatType: data.type,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // User completes exam
  socket.on('user:complete', (data) => {
    // data: { sessionId, username, score, total }
    if (liveUsers[data.sessionId]) {
      io.to('admin-room').emit('live:completed', {
        ...liveUsers[data.sessionId],
        score: data.score,
        total: data.total,
      });
      delete liveUsers[data.sessionId];
    }
  });

  socket.on('disconnect', () => {
    // Remove disconnected users from live tracking
    for (const sessionId in liveUsers) {
      if (liveUsers[sessionId].socketId === socket.id) {
        io.to('admin-room').emit('live:disconnected', { sessionId });
        delete liveUsers[sessionId];
        break;
      }
    }
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Killayda OSYM Server running on http://localhost:${PORT}`);
  console.log(`🎮 Admin password: ${process.env.ADMIN_PASSWORD || '(set ADMIN_PASSWORD in .env)'}`);
});
