import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCtffP-iNYgkLOZajszJivlXYDMPAvxC1U",
    authDomain: "checklistsystem-19096.firebaseapp.com",
    projectId: "checklistsystem-19096",
    storageBucket: "checklistsystem-19096.firebasestorage.app",
    messagingSenderId: "478291925766",
    appId: "1:478291925766:web:fb7e282d77f96296459c87",
    measurementId: "G-3XLL2RSVYC"
};

let app;
let analytics;

function getFirebaseApp() {
    if (!app) {
        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
            analytics = getAnalytics(app);
        } else {
            app = getApps()[0];
            analytics = getAnalytics(app);
        }
    }
    return app;
}

export { getFirebaseApp };

export async function saveDataToKey(data, passedKey = "") {
    const key = passedKey || localStorage.getItem("appKey");
    if (!key) throw new Error("No app key found in localStorage.");
    const db = getFirestore(getFirebaseApp());
    const docRef = doc(db, "apps", key);
    await setDoc(docRef, { ...data, appKey: key }, { merge: true });
}
  
export async function getDataByKey(passedKey = "") {
    const key = passedKey || localStorage.getItem("appKey");
    if (!key) throw new Error("No app key found in localStorage.");
    const db = getFirestore(getFirebaseApp());
    const docRef = doc(db, "apps", key);
    try {
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return null;
        return snapshot.data();
    } catch(e) {
        console.error("Error reading document for key", key, e);
        return null; 
    }
}

export async function deleteDataByKey(passedKey = "") {
    const key = passedKey || localStorage.getItem("appKey");
    if (!key) throw new Error("No app key found in localStorage.");
    const db = getFirestore(getFirebaseApp());
    const docRef = doc(db, "apps", key);
    await deleteDoc(docRef);
}
