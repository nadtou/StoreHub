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
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  FirebaseStorage
} from "firebase/storage";
import type { ProductImage } from './types';

const MAX_FIREBASE_IMAGE_BYTES = 1024 * 1024;
const MAX_BOUTIQUE_DOCUMENT_BYTES = 5 * 1024 * 1024;

export interface UploadedStorageFile {
  fullPath: string;
  name: string;
  contentType: string;
  size: number;
  url?: string;
}

async function getPreparedWebPBlob(imageDataUrl: string): Promise<Blob> {
  const imageResponse = await fetch(imageDataUrl);
  const imageBlob = await imageResponse.blob();
  if (imageBlob.type !== 'image/webp') {
    throw new Error('La photo doit être convertie en WebP avant l’envoi.');
  }
  if (imageBlob.size > MAX_FIREBASE_IMAGE_BYTES) {
    throw new Error('La photo préparée dépasse la limite de 1 Mo.');
  }
  return imageBlob;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

let initPromise: Promise<{ auth: Auth; db: Firestore; storage: FirebaseStorage }> | null = null;

export function initFirebase(): Promise<{ auth: Auth; db: Firestore; storage: FirebaseStorage }> {
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
      storage = getStorage(app);
      
      console.log("Firebase initialized successfully on the client side.");
      resolve({ auth, db, storage });
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

async function uploadBoutiqueImage(
  ownerId: string,
  boutiqueId: string,
  imageDataUrl: string,
  folder: 'covers' | 'logos',
  prefix: 'cover' | 'logo' | 'registration-logo',
): Promise<UploadedStorageFile> {
  try {
    const { storage: firebaseStorage } = await initFirebase();
    const imageBlob = await getPreparedWebPBlob(imageDataUrl);
    const imageRef = storageRef(firebaseStorage, `boutique-media/${ownerId}/${boutiqueId}/${folder}/${prefix}-${Date.now()}.webp`);
    const snapshot = await uploadBytes(imageRef, imageBlob, {
      contentType: 'image/webp',
      cacheControl: 'public,max-age=86400',
      customMetadata: { boutiqueId }
    });

    return {
      fullPath: snapshot.ref.fullPath,
      name: snapshot.ref.name,
      contentType: imageBlob.type,
      size: imageBlob.size,
      url: await getDownloadURL(snapshot.ref),
    };
  } catch (error: any) {
    if (error?.code === 'storage/unauthorized' || error?.code === 'storage/unauthenticated') {
      throw new Error('Firebase Storage refuse l’envoi. Reconnectez-vous avec votre compte boutique et vérifiez les règles Storage.');
    }
    throw error;
  }
}

export async function uploadBoutiqueCover(ownerId: string, boutiqueId: string, imageDataUrl: string): Promise<string> {
  const upload = await uploadBoutiqueImage(ownerId, boutiqueId, imageDataUrl, 'covers', 'cover');
  if (!upload.url) throw new Error('La couverture Firebase ne possède pas d’URL publique.');
  return upload.url;
}

export async function uploadBoutiqueLogo(ownerId: string, boutiqueId: string, imageDataUrl: string): Promise<string> {
  const upload = await uploadBoutiqueImage(ownerId, boutiqueId, imageDataUrl, 'logos', 'logo');
  if (!upload.url) throw new Error('Le logo Firebase ne possède pas d’URL publique.');
  return upload.url;
}

export async function uploadBoutiqueRegistrationLogo(
  ownerId: string,
  boutiqueId: string,
  imageDataUrl: string,
): Promise<UploadedStorageFile> {
  return uploadBoutiqueImage(ownerId, boutiqueId, imageDataUrl, 'logos', 'registration-logo');
}

function getVerificationDocumentExtension(file: File): string {
  const extensions: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const extension = extensions[file.type];
  if (!extension) {
    throw new Error('Le document doit être un PDF ou une image JPG, PNG ou WebP.');
  }
  return extension;
}

export async function uploadBoutiqueVerificationDocument(
  ownerId: string,
  boutiqueId: string,
  file: File,
): Promise<UploadedStorageFile> {
  if (file.size <= 0 || file.size > MAX_BOUTIQUE_DOCUMENT_BYTES) {
    throw new Error('Le document doit peser au maximum 5 Mo.');
  }

  const extension = getVerificationDocumentExtension(file);
  const { storage: firebaseStorage } = await initFirebase();
  const documentRef = storageRef(
    firebaseStorage,
    `boutique-verification/${ownerId}/${boutiqueId}/registration-${Date.now()}.${extension}`,
  );
  const snapshot = await uploadBytes(documentRef, file, {
    contentType: file.type,
    cacheControl: 'private,max-age=0,no-store',
    contentDisposition: 'attachment',
    customMetadata: {
      ownerId,
      boutiqueId,
      documentType: 'legal-verification',
    },
  });

  return {
    fullPath: snapshot.ref.fullPath,
    name: file.name.slice(0, 180),
    contentType: file.type,
    size: file.size,
  };
}

export async function deleteUploadedStorageFile(fullPath: string): Promise<void> {
  const normalizedPath = fullPath.trim();
  if (!normalizedPath) return;
  const { storage: firebaseStorage } = await initFirebase();
  await deleteObject(storageRef(firebaseStorage, normalizedPath));
}

export async function uploadClientAvatar(userId: string, imageDataUrl: string): Promise<string> {
  try {
    const { storage: firebaseStorage } = await initFirebase();
    const imageBlob = await getPreparedWebPBlob(imageDataUrl);
    const avatarRef = storageRef(firebaseStorage, `users/${userId}/avatars/avatar-${Date.now()}.webp`);
    const snapshot = await uploadBytes(avatarRef, imageBlob, {
      contentType: 'image/webp',
      cacheControl: 'public,max-age=86400',
      customMetadata: { userId },
    });

    return await getDownloadURL(snapshot.ref);
  } catch (error: any) {
    if (error?.code === 'storage/unauthorized' || error?.code === 'storage/unauthenticated') {
      throw new Error('Firebase refuse l’envoi de la photo. Reconnectez-vous puis réessayez.');
    }
    throw error;
  }
}

export async function uploadProductImages(
  ownerId: string,
  boutiqueId: string,
  productId: string,
  images: Array<{ dataUrl: string; width: number; height: number }>,
): Promise<ProductImage[]> {
  const { storage: firebaseStorage } = await initFirebase();
  return Promise.all(images.map(async (image, index) => {
    const imageBlob = await getPreparedWebPBlob(image.dataUrl);
    const imageRef = storageRef(
      firebaseStorage,
      `boutique-media/${ownerId}/${boutiqueId}/products/${productId}-${Date.now()}-${index}.webp`,
    );
    const snapshot = await uploadBytes(imageRef, imageBlob, {
      contentType: 'image/webp',
      cacheControl: 'public,max-age=86400',
      customMetadata: { boutiqueId, productId },
    });
    return {
      url: await getDownloadURL(snapshot.ref),
      width: image.width,
      height: image.height,
    };
  }));
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
