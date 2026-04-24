import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAYcz9RiHMRHfBfzCIgzLxH8k0_7lyWp7U",
  authDomain: "formsbar.firebaseapp.com",
  databaseURL: "https://formsbar-default-rtdb.firebaseio.com",
  projectId: "formsbar",
  storageBucket: "formsbar.firebasestorage.app",
  messagingSenderId: "441738844508",
  appId: "1:441738844508:web:776520f94ce1745a8a4999"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

// Login anônimo automático — o usuário não percebe
signInAnonymously(auth).catch((err) => {
  console.error('Erro no login anônimo:', err);
});

export default app;
