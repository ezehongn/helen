// ========================================
// FIREBASE CONFIGURATION
// ========================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


const firebaseConfig = {

    apiKey:
        "AIzaSyC89O5y1-UPfwqzZS3uU1kE5eEnZNO4f-I",

    authDomain:
        "helen-ceff5.firebaseapp.com",

    projectId:
        "helen-ceff5",

    storageBucket:
        "helen-ceff5.firebasestorage.app",

    messagingSenderId:
        "376230636371",

    appId:
        "1:376230636371:web:2b89e0225f799761804fa6"

};


const app =
    initializeApp(
        firebaseConfig
    );


const auth =
    getAuth(
        app
    );


const db =
    getFirestore(
        app
    );


window.auth =
    auth;

window.db =
    db;