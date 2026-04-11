const express = require('express');
const router = express.Router();
const { getDb } = require('../firebase');

// GET all results
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.json([]);
    const snapshot = await db.collection('results').orderBy('completedAt', 'desc').get();
    const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET results by examId
router.get('/exam/:examId', async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.json([]);
    const snapshot = await db
      .collection('results')
      .where('examId', '==', req.params.examId)
      .orderBy('percentage', 'desc')
      .get();
    const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET results by username
router.get('/user/:username', async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.json([]);
    const snapshot = await db
      .collection('results')
      .where('username', '==', req.params.username)
      .orderBy('completedAt', 'desc')
      .get();
    const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
