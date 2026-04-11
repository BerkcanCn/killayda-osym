const admin = require('firebase-admin');

let db;

function initFirebase() {
  if (admin.apps.length > 0) {
    db = admin.app().firestore();
    return;
  }

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    db = admin.firestore();
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    console.log('⚠️  Running in demo mode without Firebase');
    db = null;
  }
}

function getDb() {
  return db;
}

module.exports = { initFirebase, getDb };
