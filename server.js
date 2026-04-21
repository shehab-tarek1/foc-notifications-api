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
    
    const tokens =[];
    tokensSnapshot.forEach(doc => {
      if (doc.data().token) tokens.push(doc.data().token);
    });

    if (tokens.length === 0) {
      return res.status(400).json({ error: 'لا يوجد مستخدمين لإرسال الإشعار لهم' });
    }

    // 2. تجهيز رسالة الإشعار
    const message = {
      notification: {
        title: title,
        body: body
      },
      tokens: tokens // إرسال جماعي لكل التوكنز
    };

    // 3. إرسال الإشعار
    const response = await admin.messaging().sendEachForMulticast(message);
    
    res.status(200).json({ 
        success: true, 
        message: `تم الإرسال بنجاح إلى ${response.successCount} جهاز، وفشل إرسال ${response.failureCount} جهاز.` 
    });

  } catch (error) {
    console.error("خطأ:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
