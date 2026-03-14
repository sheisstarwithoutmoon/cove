import admin from "firebase-admin";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Use environment variable (Render production)
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Use local JSON file (local development)
  const { createRequire } = await import("module");
  const require = createRequire(import.meta.url);

  try {
    serviceAccount = require("./serviceAccountKey.json");
  } catch (e) {
    console.error(
      "❌ Firebase credentials not found! Add FIREBASE_SERVICE_ACCOUNT env variable or serviceAccountKey.json locally."
    );
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

export async function verifyToken(token) {
  try {
    return await admin.auth().verifyIdToken(token);
  } catch {
    return null;
  }
}

export async function saveReport(uid, query, report) {
  try {
    const ref = db.collection("users").doc(uid).collection("reports").doc();
    await ref.set({ uid, query, report, created_at: new Date().toISOString() });
    return ref.id;
  } catch (e) {
    console.error("Save report error:", e.message);
    return null;
  }
}

export async function getReports(uid) {
  try {
    const userSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("reports")
      .orderBy("created_at", "desc")
      .limit(20)
      .get();

    const userReports = userSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (userReports.length > 0) return userReports;

    const legacySnapshot = await db
      .collection("reports")
      .where("uid", "==", uid)
      .orderBy("created_at", "desc")
      .limit(20)
      .get();

    return legacySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error("Get reports error:", e.message);
    return [];
  }
}

export async function getUserProfile(uid) {
  try {
    const doc = await db.collection("users").doc(uid).get();
    if (!doc.exists) return { interests: [] };
    const data = doc.data() || {};
    return {
      interests: Array.isArray(data.interests) ? data.interests : [],
    };
  } catch (e) {
    console.error("Get user profile error:", e.message);
    return { interests: [] };
  }
}

export async function saveUserProfile(uid, profile = {}) {
  try {
    const interests = Array.isArray(profile.interests) ? profile.interests : [];
    await db.collection("users").doc(uid).set(
      {
        uid,
        interests,
        profile_updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
    return { interests };
  } catch (e) {
    console.error("Save user profile error:", e.message);
    return { interests: [] };
  }
}