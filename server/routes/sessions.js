const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../firebase');

// POST - Start a new exam session
router.post('/start', async (req, res) => {
  try {
    const { username, examId, examTitle, totalQuestions } = req.body;
    if (!username || !examId) {
      return res.status(400).json({ error: 'username ve examId gerekli' });
    }

    const sessionId = uuidv4();
    const sessionData = {
      sessionId,
      username,
      examId,
      examTitle: examTitle || '',
      totalQuestions: totalQuestions || 0,
      currentQuestion: 0,
      answers: {},
      cheatFlags: [],
      startedAt: new Date().toISOString(),
      status: 'in_progress',
    };

    const db = getDb();
    if (db) {
      await db.collection('sessions').doc(sessionId).set(sessionData);
    }

    res.status(201).json(sessionData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH - Update current question and answer
router.patch('/:sessionId/progress', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { currentQuestion, questionId, answer } = req.body;

    const updateData = {
      currentQuestion,
      updatedAt: new Date().toISOString(),
    };
    if (questionId && answer) {
      updateData[`answers.${questionId}`] = answer;
    }

    const db = getDb();
    if (db) {
      await db.collection('sessions').doc(sessionId).update(updateData);
    }

    // Notify socket via io (accessed from app)
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST - Record a cheat flag
router.post('/:sessionId/cheat', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { type } = req.body; // 'blur' | 'visibility'

    const cheatFlag = {
      type,
      timestamp: new Date().toISOString(),
    };

    const db = getDb();
    if (db) {
      const sessionRef = db.collection('sessions').doc(sessionId);
      const doc = await sessionRef.get();
      if (doc.exists) {
        const existing = doc.data().cheatFlags || [];
        await sessionRef.update({
          cheatFlags: [...existing, cheatFlag],
        });
      }
    }

    res.json({ success: true, cheatFlag });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST - Complete session and calculate score
router.post('/:sessionId/complete', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answers, examId } = req.body;

    const db = getDb();

    // Fetch exam to calculate score
    let exam = null;
    if (db) {
      const examDoc = await db.collection('exams').doc(examId).get();
      if (examDoc.exists) exam = { id: examDoc.id, ...examDoc.data() };
    } else {
      const { getDemoExams } = require('./exams');
      exam = getDemoExams().find(e => e.id === examId);
    }

    // Calculate score
    let score = 0;
    const questions = exam?.questions || [];
    questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) score++;
    });

    const total = questions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    // Fetch session for cheat flags
    let cheatFlags = [];
    let username = '';
    let examTitle = '';

    if (db) {
      const sessionDoc = await db.collection('sessions').doc(sessionId).get();
      if (sessionDoc.exists) {
        const data = sessionDoc.data();
        cheatFlags = data.cheatFlags || [];
        username = data.username;
        examTitle = data.examTitle;
      }

      // Save result
      const resultData = {
        sessionId,
        username,
        examId,
        examTitle: examTitle || exam?.title || '',
        score,
        totalQuestions: total,
        percentage,
        answers,
        cheatFlags,
        completedAt: new Date().toISOString(),
      };

      await db.collection('results').add(resultData);
      await db.collection('sessions').doc(sessionId).update({
        status: 'completed',
        completedAt: new Date().toISOString(),
        score,
        percentage,
      });
    }

    res.json({ score, total, percentage, cheatFlags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single session
router.get('/:sessionId', async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.json({ sessionId: req.params.sessionId, status: 'in_progress' });
    const doc = await db.collection('sessions').doc(req.params.sessionId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Oturum bulunamadı' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
