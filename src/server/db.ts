import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  setDoc, 
  doc, 
  query, 
  where,
  deleteDoc
} from "firebase/firestore";
import fs from "fs";
import path from "path";
import { mockBoutiques, mockProducts } from "../mockData";
import { Boutique, Product, UserProfile, UserRole } from "../types";

// Load Firebase configuration from the auto-generated config file
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    console.log("Loaded Firebase configuration successfully.");
  } else {
    console.warn("firebase-applet-config.json not found. Using empty config fallback.");
  }
} catch (error) {
  console.error("Failed to read firebase-applet-config.json:", error);
}

// Initialize Firebase App and Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

// Collection References
export const boutiquesCol = collection(db, "boutiques");
export const productsCol = collection(db, "products");
export const usersCol = collection(db, "users");

// Seeding function to populate Firestore if it's empty
export async function seedDatabaseIfNeeded() {
  try {
    const boutiquesSnapshot = await getDocs(boutiquesCol);
    
    if (boutiquesSnapshot.empty) {
      console.log("Boutiques collection is empty. Seeding mock boutiques...");
      for (const b of mockBoutiques) {
        await setDoc(doc(db, "boutiques", b.id), b);
      }
      console.log("Boutiques collection seeded successfully!");
    } else {
      console.log("Boutiques collection already has data.");
    }

    const productsSnapshot = await getDocs(productsCol);
    if (productsSnapshot.empty) {
      console.log("Products collection is empty. Seeding mock products...");
      for (const p of mockProducts) {
        await setDoc(doc(db, "products", p.id), p);
      }
      console.log("Products collection seeded successfully!");
    } else {
      console.log("Products collection already has data.");
    }

    const usersSnapshot = await getDocs(usersCol);
    if (usersSnapshot.empty) {
      console.log("Users collection is empty. Seeding mock users...");
      const demoUsers: UserProfile[] = [
        {
          uid: "user_demo_1",
          email: "client@storehub.com",
          displayName: "Marie Laurent",
          role: UserRole.CLIENT,
          photoURL: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
          preferences: {
            styles: ["Minimaliste", "Élégant"],
            sizes: ["M", "38"],
            favoriteCategories: ["robes", "outerwear"]
          },
          stats: {
            favoritesCount: 2,
            viewedProducts: 14
          },
          createdAt: new Date().toISOString()
        },
        {
          uid: "user_demo_2",
          email: "atelier@storehub.com",
          displayName: "Atelier Noir",
          role: UserRole.BOUTIQUE,
          photoURL: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=200&q=80",
          createdAt: new Date().toISOString()
        },
        {
          uid: "user_admin_1",
          email: "toukaka18@gmail.com",
          displayName: "Administrateur principal",
          role: UserRole.ADMIN,
          photoURL: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
          createdAt: new Date().toISOString()
        }
      ];
      for (const u of demoUsers) {
        await setDoc(doc(db, "users", u.uid), u);
      }
      console.log("Users collection seeded successfully!");
    } else {
      console.log("Users collection already has data.");
    }
  } catch (error) {
    console.error("Error during database seeding:", error);
  }
}

// Data helper functions
export async function getBoutiques(): Promise<Boutique[]> {
  const snapshot = await getDocs(boutiquesCol);
  const items: Boutique[] = [];
  snapshot.forEach((doc) => {
    items.push(doc.data() as Boutique);
  });
  return items;
}

export async function getProducts(): Promise<Product[]> {
  const snapshot = await getDocs(productsCol);
  const items: Product[] = [];
  snapshot.forEach((doc) => {
    items.push(doc.data() as Product);
  });
  return items;
}

export async function addProductToFirestore(product: Product): Promise<void> {
  await setDoc(doc(db, "products", product.id), product);
}

export async function saveUserProfile(user: UserProfile): Promise<void> {
  await setDoc(doc(db, "users", user.uid), user, { merge: true });
}

export async function getUserProfile(email: string): Promise<UserProfile | null> {
  const q = query(usersCol, where("email", "==", email));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  let user: UserProfile | null = null;
  snapshot.forEach((doc) => {
    user = doc.data() as UserProfile;
  });
  return user;
}

// Admin helper functions
export async function getAllUsers(): Promise<UserProfile[]> {
  const snapshot = await getDocs(usersCol);
  const items: UserProfile[] = [];
  snapshot.forEach((doc) => {
    items.push(doc.data() as UserProfile);
  });
  return items;
}

export async function updateBoutiqueInFirestore(id: string, updates: Partial<Boutique>): Promise<void> {
  const boutiqueDoc = doc(db, "boutiques", id);
  await setDoc(boutiqueDoc, updates, { merge: true });
}

export async function deleteBoutiqueFromFirestore(id: string): Promise<void> {
  const boutiqueDoc = doc(db, "boutiques", id);
  await deleteDoc(boutiqueDoc);
}

export async function deleteProductFromFirestore(id: string): Promise<void> {
  const productDoc = doc(db, "products", id);
  await deleteDoc(productDoc);
}

// -------------------------------------------------------------
// Live Client-Boutique Chat helper functions
// -------------------------------------------------------------

export interface ChatMessage {
  id: string;
  chatId: string;
  clientId: string;
  clientName: string;
  clientPhoto: string;
  boutiqueId: string;
  boutiqueName: string;
  boutiqueLogo: string;
  senderId: string;
  senderName: string;
  senderRole: "client" | "boutique";
  text: string;
  createdAt: string;
}

export const chatsCol = collection(db, "chats");

export async function addMessageToFirestore(message: ChatMessage): Promise<void> {
  await setDoc(doc(db, "chats", message.id), message);
}

export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  const q = query(chatsCol, where("chatId", "==", chatId));
  const snapshot = await getDocs(q);
  const items: ChatMessage[] = [];
  snapshot.forEach((doc) => {
    items.push(doc.data() as ChatMessage);
  });
  return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function getMessagesByClient(clientId: string): Promise<ChatMessage[]> {
  const q = query(chatsCol, where("clientId", "==", clientId));
  const snapshot = await getDocs(q);
  const items: ChatMessage[] = [];
  snapshot.forEach((doc) => {
    items.push(doc.data() as ChatMessage);
  });
  return items;
}

export async function getMessagesByBoutique(boutiqueId: string): Promise<ChatMessage[]> {
  const q = query(chatsCol, where("boutiqueId", "==", boutiqueId));
  const snapshot = await getDocs(q);
  const items: ChatMessage[] = [];
  snapshot.forEach((doc) => {
    items.push(doc.data() as ChatMessage);
  });
  return items;
}


