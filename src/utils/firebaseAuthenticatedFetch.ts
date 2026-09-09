import { initFirebase } from "../firebase";
import { onAuthStateChanged, type Auth, type User } from "firebase/auth";

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

/** Attach a fresh Firebase ID token to private API requests. */
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

  return fetch(input, { ...init, headers });
}
