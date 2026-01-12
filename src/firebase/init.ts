import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

console.log('🔥 Firebase 초기화 시작...')

// 환경 변수 확인
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

console.log('📝 Firebase 설정:', {
    apiKey: firebaseConfig.apiKey ? '✅ 설정됨' : '❌ 없음',
    authDomain: firebaseConfig.authDomain || '❌ 없음',
    projectId: firebaseConfig.projectId || '❌ 없음',
    storageBucket: firebaseConfig.storageBucket || '❌ 없음',
    messagingSenderId: firebaseConfig.messagingSenderId ? '✅ 설정됨' : '❌ 없음',
    appId: firebaseConfig.appId ? '✅ 설정됨' : '❌ 없음',
    measurementId: firebaseConfig.measurementId ? '✅ 설정됨' : '❌ 없음'
})

// Firebase 앱 초기화
const existingApps = getApps()
console.log('🔍 기존 Firebase 앱 개수:', existingApps.length)

const app = existingApps.length ? existingApps[0] : initializeApp(firebaseConfig)
console.log('✅ Firebase 앱 초기화 완료:', app.name)

// Firestore 초기화
export const db = getFirestore(app)
console.log('✅ Firestore 초기화 완료')

// Storage 초기화
export const storage = getStorage(app)
console.log('✅ Storage 초기화 완료')

console.log('🎉 Firebase 모든 서비스 초기화 완료!')