import { initFirebase } from "../firebase";
import { onAuthStateChanged, type Auth, type User } from "firebase/auth";
import { getToken } from 'firebase/app-check';
import { resolveStoreHubApiUrl } from '../config/runtimeUrls';

export class FirebaseAuthRequiredError extends Error {
  constructor() {
    super("Reconnectez-vous avec Firebase pour accéder à la messagerie sécurisée.");
    this.name = "FirebaseAuthRequiredError";
  }
}

function waitForFirebaseAuth(auth: Auth): Promise<User | null> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  return new Promise((resolve) => {
    let unsubscribe = () => {};
    const timeout = window.setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser);
    }, 5000);

    unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(firebaseUser);
    });
  });
}

async function withAppCheckHeader(headers: Headers): Promise<void> {
  const { appCheck } = await initFirebase();
  if (!appCheck) return;
  const tokenResult = await getToken(appCheck, false);
  headers.set('X-Firebase-AppCheck', tokenResult.token);
}

/** Attach an App Check token to public custom API requests when configured. */
export async function firebaseAppCheckFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  await withAppCheckHeader(headers);
  return fetch(resolveStoreHubApiUrl(input), { ...init, headers });
}

/** Attach fresh Firebase Auth and App Check tokens to private API requests. */
export async function firebaseAuthenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const { auth } = await initFirebase();
  const firebaseUser = auth.currentUser || await waitForFirebaseAuth(auth);
  if (!firebaseUser) throw new FirebaseAuthRequiredError();

  const idToken = await firebaseUser.getIdToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${idToken}`);
  await withAppCheckHeader(headers);

  return fetch(resolveStoreHubApiUrl(input), { ...init, headers });
}
