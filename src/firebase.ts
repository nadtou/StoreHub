import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  Auth, 
  signInWithEmailAndPassword as fbSignIn,
  createUserWithEmailAndPassword as fbCreateUser,
  signOut as fbSignOut,
  User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  Firestore, 
  doc, 
  getDoc, 
  setDoc 
} from "firebase/firestore";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

let initPromise: Promise<{ auth: Auth; db: Firestore }> | null = null;

export function initFirebase(): Promise<{ auth: Auth; db: Firestore }> {
  if (initPromise) return initPromise;

  initPromise = new Promise(async (resolve, reject) => {
    try {
      const response = await fetch("/api/firebase-config");
      if (!response.ok) {
        throw new Error("Failed to fetch Firebase applet configuration from API");
      }
      const firebaseConfig = await response.json();
      
      if (getApps().length > 0) {
        app = getApp();
      } else {
        app = initializeApp(firebaseConfig);
      }
      auth = getAuth(app);
      // Initialize Firestore specifying the databaseId if present in config
      db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
      
      console.log("Firebase initialized successfully on the client side.");
      resolve({ auth, db });
    } catch (error) {
      console.error("Client-side Firebase initialization failed:", error);
      reject(error);
    }
  });

  return initPromise;
}

// Ensure safe synchronous access after initialization
export function getClientAuth(): Auth {
  if (!auth) throw new Error("Firebase Auth has not been initialized yet.");
  return auth;
}

export function getClientDb(): Firestore {
  if (!db) throw new Error("Firestore DB has not been initialized yet.");
  return db;
}

// Error handling based on Firebase Skill instructions
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentAuth = auth;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.currentUser?.uid || null,
      email: currentAuth?.currentUser?.email || null,
      emailVerified: currentAuth?.currentUser?.emailVerified || null,
      isAnonymous: currentAuth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
