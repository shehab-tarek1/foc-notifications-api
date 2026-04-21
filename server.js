const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// تهيئة اتصال آمن مع فايربيز باستخدام متغيرات البيئة (بدون ملف JSON)
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // السطر التالي مهم جداً لمعالجة المسافات والرموز المخفية في المفتاح
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
  })
});

const app = express();
app.use(cors()); // السماح لصفحة الأدمن بالاتصال بهذا السيرفر
app.use(express.json());

// الرابط الذي ستتصل به صفحة الأدمن
app.post('/send-broadcast', async (req, res) => {
  const { title, body, adminPassword } = req.body;

  // حماية السيرفر (كلمة السر دي هنحددها في إعدادات موقع Render)
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "غير مصرح لك بإرسال إشعارات!" });
  }

  try {
    // 1. جلب جميع التوكنز من قاعدة البيانات
    const db = admin.firestore();
    const tokensSnapshot = await db.collection('fcm_tokens').get();
    
    const tokens =
