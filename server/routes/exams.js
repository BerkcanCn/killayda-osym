const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../firebase');

// GET all exams
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.json(getDemoExams());
    const snapshot = await db.collection('exams').orderBy('createdAt', 'desc').get();
    const exams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(exams);
  } catch (err) {
    console.error('Error fetching exams:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET single exam
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      const demos = getDemoExams();
      const exam = demos.find(e => e.id === req.params.id);
      return exam ? res.json(exam) : res.status(404).json({ error: 'Not found' });
    }
    const doc = await db.collection('exams').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Sınav bulunamadı' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create exam
router.post('/', async (req, res) => {
  try {
    const { title, description, isActive = false, questions = [] } = req.body;
    if (!title) return res.status(400).json({ error: 'Sınav başlığı gerekli' });

    const examData = {
      title,
      description: description || '',
      isActive,
      questions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const db = getDb();
    if (!db) {
      return res.json({ id: uuidv4(), ...examData });
    }

    const docRef = await db.collection('exams').add(examData);
    res.status(201).json({ id: docRef.id, ...examData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update exam
router.put('/:id', async (req, res) => {
  try {
    const { title, description, isActive, questions } = req.body;
    const updateData = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
      ...(questions !== undefined && { questions }),
      updatedAt: new Date().toISOString(),
    };

    const db = getDb();
    if (!db) return res.json({ id: req.params.id, ...updateData });

    await db.collection('exams').doc(req.params.id).update(updateData);
    const updated = await db.collection('exams').doc(req.params.id).get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE exam
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.json({ success: true });
    await db.collection('exams').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Demo data when Firebase is not configured
function getDemoExams() {
  return [
    {
      id: 'demo-1',
      title: 'Killayda Lore Testi',
      description: 'Killayda\'nın kanalını ne kadar iyi biliyorsun?',
      isActive: true,
      createdAt: new Date().toISOString(),
      questions: [
        {
          id: 'q1',
          text: 'Killayda\'nın en çok oynadığı oyun hangisidir?',
          options: { A: 'Valorant', B: 'League of Legends', C: 'CS2', D: 'Minecraft' },
          correctAnswer: 'A',
        },
        {
          id: 'q2',
          text: '"Kemik Kadro" terimi ne anlama gelir?',
          options: { A: 'Yeni izleyiciler', B: 'Sadık çekirdek izleyici kitlesi', C: 'Moderatörler', D: 'Aboneler' },
          correctAnswer: 'B',
        },
        {
          id: 'q3',
          text: 'Killayda en çok hangi platformda yayın yapar?',
          options: { A: 'YouTube', B: 'TikTok', C: 'Twitch', D: 'Kick' },
          correctAnswer: 'C',
        },
      ],
    },
  ];
}

module.exports = router;
module.exports.getDemoExams = getDemoExams;
