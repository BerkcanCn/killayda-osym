const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../firebase');

// Her oturumda soru havuzundan seçilecek soru sayısı
const QUESTIONS_PER_SESSION = 10;

// Havuzdan rastgele soru seçer:
// soruların sıra numaralarını (index) bir diziye alır, Fisher-Yates ile
// karıştırır ve ilk `count` tanesini soruya çevirerek döndürür.
// Havuz `count`'tan küçükse mevcut soruların tamamını (karışık sırayla) döndürür.
function pickRandomQuestions(pool, count) {
  const indices = pool.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count).map((i) => pool[i]);
}

// POST - Start a new exam session
router.post('/start', async (req, res) => {
  try {
    const { username, examId, examTitle } = req.body;
    if (!username || !examId) {
      return res.status(400).json({ error: 'username ve examId gerekli' });
    }

    const db = getDb();

    // Soru havuzu için sınavı ayrı bir sorguyla çek
    let exam = null;
    if (db) {
      const examDoc = await db.collection('exams').doc(examId).get();
      if (examDoc.exists) exam = { id: examDoc.id, ...examDoc.data() };
    } else {
      const { getDemoExams } = require('./exams');
      exam = getDemoExams().find((e) => e.id === examId);
    }

    if (!exam) return res.status(404).json({ error: 'Sınav bulunamadı' });

    // Havuzdan bu oturuma özel rastgele 10 soru seç
    const pool = exam.questions || [];
    const selectedQuestions = pickRandomQuestions(pool, QUESTIONS_PER_SESSION);

    const sessionId = uuidv4();
    const sessionData = {
      sessionId,
      username,
      examId,
      examTitle: examTitle || exam.title || '',
      totalQuestions: selectedQuestions.length,
      questions: selectedQuestions, // bu session'a servis edilen sorular
      currentQuestion: 0,
      answers: {},
      cheatFlags: [],
      startedAt: new Date().toISOString(),
      status: 'in_progress',
    };

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

    // Oturumu çek: bu session'a özel seçilen sorular ve cheat kayıtları burada
    let sessionData = null;
    if (db) {
      const sessionDoc = await db.collection('sessions').doc(sessionId).get();
      if (sessionDoc.exists) sessionData = sessionDoc.data();
    }

    // Puanlama, bu oturuma servis edilen sorular üzerinden yapılır.
    // Oturum bulunamazsa (ör. Firebase'siz demo mod) sınav havuzuna düşülür.
    let servedQuestions = sessionData?.questions;
    if (!servedQuestions) {
      let exam = null;
      if (db) {
        const examDoc = await db.collection('exams').doc(examId).get();
        if (examDoc.exists) exam = { id: examDoc.id, ...examDoc.data() };
      } else {
        const { getDemoExams } = require('./exams');
        exam = getDemoExams().find((e) => e.id === examId);
      }
      // Oturum kaydı yoksa (ör. demo mod) cevaplanan sorular servis edilenlerdir
      const pool = exam?.questions || [];
      servedQuestions = pool.filter((q) =>
        Object.prototype.hasOwnProperty.call(answers, q.id)
      );
    }

    // Skoru hesapla (cevaplar soru id'sine göre eşleştirilir, sıra önemsiz)
    let score = 0;
    servedQuestions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) score++;
    });

    const total = servedQuestions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    const cheatFlags = sessionData?.cheatFlags || [];
    const username = sessionData?.username || '';
    const examTitle = sessionData?.examTitle || '';

    if (db) {
      // Save result
      const resultData = {
        sessionId,
        username,
        examId,
        examTitle: examTitle || '',
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
