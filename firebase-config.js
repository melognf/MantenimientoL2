import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCrD3HfY6G-favXZpdmDGKfrz92EmiDYZ4",
  authDomain: "mantenimientol2.firebaseapp.com",
  projectId: "mantenimientol2",
  storageBucket: "mantenimientol2.appspot.com",
  messagingSenderId: "186012650312",
  appId: "1:186012650312:web:bfa59b02cf560a0201c17d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
