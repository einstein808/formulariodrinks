import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Helper to clean environment variables (removing potential surrounding quotes)
const cleanEnvVar = (val) => {
  if (typeof val === 'string') {
    return val.replace(/^["']|["']$/g, '').trim();
  }
  return val;
};

const rawApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const rawProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const rawDatabaseUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

const isConfigured = rawProjectId && rawDatabaseUrl;

const firebaseConfig = {
  apiKey: cleanEnvVar(rawApiKey) || (isConfigured ? undefined : "mock-api-key"),
  authDomain: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) || (isConfigured ? undefined : "mock-project.firebaseapp.com"),
  databaseURL: cleanEnvVar(rawDatabaseUrl) || (isConfigured ? undefined : "https://mock-project-default-rtdb.firebaseio.com"),
  projectId: cleanEnvVar(rawProjectId) || (isConfigured ? undefined : "mock-project"),
  storageBucket: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) || (isConfigured ? undefined : "mock-project.firebasestorage.app"),
  messagingSenderId: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) || (isConfigured ? undefined : "000000000000"),
  appId: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_APP_ID) || (isConfigured ? undefined : "1:000000000000:web:0000000000000000000000")
};

let app;
let db;
let auth;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getDatabase(app);
  auth = getAuth(app);
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
  db = {};
  auth = {};
}

export { db, auth };
export default app;

