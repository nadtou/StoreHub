import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { 
  seedDatabaseIfNeeded, 
  getBoutiques, 
  getProducts, 
  addProductToFirestore,
  saveUserProfile,
  getUserProfile,
  getAllUsers,
  updateBoutiqueInFirestore,
  deleteBoutiqueFromFirestore,
  deleteProductFromFirestore,
  addMessageToFirestore,
  getChatMessages,
  getMessagesByClient,
  getMessagesByBoutique,
  ChatMessage
} from "./src/server/db";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve the assets directory from the root
app.use("/assets", express.static(path.join(process.cwd(), "assets")));

// Lazy initialize Gemini client safely as instructed
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined in environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY_FOR_BUILD",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// -------------------------------------------------------------
// API Routes
// -------------------------------------------------------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// GET firebase config for the client
app.get("/api/firebase-config", (req, res) => {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      res.json(config);
    } else {
      res.status(404).json({ error: "Firebase applet config not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to read Firebase config" });
  }
});

// GET boutiques
app.get("/api/boutiques", async (req, res) => {
  try {
    const boutiques = await getBoutiques();
    res.json(boutiques);
  } catch (error: any) {
    console.error("Error fetching boutiques:", error);
    res.status(500).json({ error: error.message || "Failed to fetch boutiques" });
  }
});

// GET products
app.get("/api/products", async (req, res) => {
  try {
    const products = await getProducts();
    res.json(products);
  } catch (error: any) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: error.message || "Failed to fetch products" });
  }
});

// POST products (Add product)
app.post("/api/products", async (req, res) => {
  try {
    const product = req.body;
    if (!product || !product.id) {
      return res.status(400).json({ error: "Invalid product data" });
    }
    await addProductToFirestore(product);
    res.status(201).json({ message: "Product created successfully", product });
  } catch (error: any) {
    console.error("Error saving product:", error);
    res.status(500).json({ error: error.message || "Failed to save product" });
  }
});

// GET user profile by email or direct query
app.get("/api/users/profile", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: "Email query parameter is required" });
    }
    const profile = await getUserProfile(email.toString());
    if (!profile) {
      return res.status(404).json({ error: "User profile not found" });
    }
    res.json(profile);
  } catch (error: any) {
    console.error("Error retrieving user profile:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve user profile" });
  }
});

// POST save or update user profile
app.post("/api/users/profile", async (req, res) => {
  try {
    const user = req.body;
    if (!user || !user.email) {
      return res.status(400).json({ error: "Invalid user data" });
    }
    // Generate simple uid if not exists
    if (!user.uid) {
      user.uid = `user_${Date.now()}`;
    }
    if (!user.createdAt) {
      user.createdAt = new Date().toISOString();
    }
    await saveUserProfile(user);
    res.status(200).json({ message: "User profile saved successfully", user });
  } catch (error: any) {
    console.error("Error saving user profile:", error);
    res.status(500).json({ error: error.message || "Failed to save user profile" });
  }
});

// Admin API: GET all user profiles
app.get("/api/admin/users", async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error: any) {
    console.error("Error fetching all users for admin:", error);
    res.status(500).json({ error: error.message || "Failed to fetch users" });
  }
});

// Admin API: UPDATE boutique details (verification, feature, suspend)
app.put("/api/admin/boutiques/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    await updateBoutiqueInFirestore(id, updates);
    res.json({ message: "Boutique updated successfully", id, updates });
  } catch (error: any) {
    console.error("Error updating boutique:", error);
    res.status(500).json({ error: error.message || "Failed to update boutique" });
  }
});

// Admin API: DELETE boutique
app.delete("/api/admin/boutiques/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await deleteBoutiqueFromFirestore(id);
    res.json({ message: "Boutique deleted successfully", id });
  } catch (error: any) {
    console.error("Error deleting boutique:", error);
    res.status(500).json({ error: error.message || "Failed to delete boutique" });
  }
});

// Admin API: DELETE product
app.delete("/api/admin/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await deleteProductFromFirestore(id);
    res.json({ message: "Product deleted successfully", id });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: error.message || "Failed to delete product" });
  }
});

// -------------------------------------------------------------
// Live Client-Boutique Chat API Routes
// -------------------------------------------------------------

// GET all messages in a specific chat thread
app.get("/api/chats/messages", async (req, res) => {
  try {
    const { chatId } = req.query;
    if (!chatId) {
      return res.status(400).json({ error: "chatId query parameter is required" });
    }
    const messages = await getChatMessages(chatId.toString());
    res.json(messages);
  } catch (error: any) {
    console.error("Error retrieving chat messages:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve messages" });
  }
});

// POST send/save a message
app.post("/api/chats/messages", async (req, res) => {
  try {
    const message: ChatMessage = req.body;
    if (!message || !message.id || !message.chatId || !message.text) {
      return res.status(400).json({ error: "Invalid message data" });
    }
    await addMessageToFirestore(message);
    res.status(201).json({ message: "Message saved successfully", data: message });
  } catch (error: any) {
    console.error("Error saving chat message:", error);
    res.status(500).json({ error: error.message || "Failed to save message" });
  }
});

// GET client chat threads
app.get("/api/chats/threads/client/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;
    const messages = await getMessagesByClient(clientId);
    
    // Group by boutiqueId and find the latest message
    const threadMap: { [boutiqueId: string]: ChatMessage } = {};
    for (const msg of messages) {
      const existing = threadMap[msg.boutiqueId];
      if (!existing || new Date(msg.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        threadMap[msg.boutiqueId] = msg;
      }
    }

    const threads = Object.values(threadMap).map(msg => ({
      chatId: msg.chatId,
      boutiqueId: msg.boutiqueId,
      boutiqueName: msg.boutiqueName,
      boutiqueLogo: msg.boutiqueLogo,
      lastMessageText: msg.text,
      lastMessageTime: msg.createdAt,
      senderRole: msg.senderRole,
      senderName: msg.senderName
    }));

    // Sort by lastMessageTime descending
    threads.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    res.json(threads);
  } catch (error: any) {
    console.error("Error retrieving client threads:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve threads" });
  }
});

// GET boutique chat threads
app.get("/api/chats/threads/boutique/:boutiqueId", async (req, res) => {
  try {
    const { boutiqueId } = req.params;
    const messages = await getMessagesByBoutique(boutiqueId);

    // Group by clientId and find the latest message
    const threadMap: { [clientId: string]: ChatMessage } = {};
    for (const msg of messages) {
      const existing = threadMap[msg.clientId];
      if (!existing || new Date(msg.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        threadMap[msg.clientId] = msg;
      }
    }

    const threads = Object.values(threadMap).map(msg => ({
      chatId: msg.chatId,
      clientId: msg.clientId,
      clientName: msg.clientName,
      clientPhoto: msg.clientPhoto,
      lastMessageText: msg.text,
      lastMessageTime: msg.createdAt,
      senderRole: msg.senderRole,
      senderName: msg.senderName
    }));

    // Sort by lastMessageTime descending
    threads.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    res.json(threads);
  } catch (error: any) {
    console.error("Error retrieving boutique threads:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve threads" });
  }
});

// Personal Stylist Chat Endpoint
app.post("/api/stylist/chat", async (req, res) => {
  try {
    const { message, history, preferences } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const ai = getGeminiClient();
    const model = "gemini-3.5-flash";

    // Fetch dynamic products list from Firestore for Aurelia to analyze
    const currentProducts = await getProducts();

    const systemInstruction = `You are "Aurelia", the Elite Personal Haute Couture Stylist for StoreHub—a luxury, high-fashion boutique showcase app hosting Avant-Garde Scandinavian outerwear, Italian sun-drenched silks, and Parisian monochromes.
Your tone is highly sophisticated, warm, attentive, and incredibly knowledgeable about tailoring, fabrics, colors, and aesthetics.
Your clients value exquisite taste, refined craftsmanship, and visual storytelling.

Here are the StoreHub boutiques and products in our curated collection:
${JSON.stringify(currentProducts, null, 2)}

User preferences from onboarding quiz:
- Favorite Styles: ${preferences?.styles?.join(', ') || 'General Couture'}
- Favorite Categories: ${preferences?.favoriteCategories?.join(', ') || 'All Pieces'}

Guidelines:
1. Speak elegantly (French/English based on customer's input, default to French or fluent bilingual).
2. Suggest 1 or 2 specific products from StoreHub (using exact product names) that match their request or preferences.
3. Offer concrete styling tips (e.g. "Pair the Caban en Lin Riviera with warm gold jewelry for a late-afternoon yacht mood").
4. Keep answers relatively concise (2-3 short, sensory paragraphs) so it fits beautifully in our scrollable boutique chat window.`;

    // Convert client history to format accepted by Gemini Chat
    const contents = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in stylist chat:", error);
    res.status(500).json({ error: error.message || "Something went wrong with the AI stylist" });
  }
});

// Visual Search & Style Analysis Endpoint
app.post("/api/visual-search", async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Base64 image is required" });
    }

    // Strip header if present (e.g., "data:image/jpeg;base64,")
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const ai = getGeminiClient();
    const model = "gemini-3.5-flash";

    // Fetch dynamic products list from Firestore for matching
    const currentProducts = await getProducts();

    const prompt = `Analyze this premium fashion inspiration photo. Determine its core aesthetic qualities and return a JSON object containing the analysis.
You MUST output strictly a JSON object matching the schema below. No markdown wrapping except raw JSON text.

JSON Schema:
{
  "detectedStyle": "Name of the style category (e.g., Minimaliste, Avant-Garde, Luxe Chaud, Élégant, Technique)",
  "colorPalette": ["List", "of", "dominant", "hex", "or", "color", "names"],
  "materials": ["Detected fabrics like linen, silk, wool, leather"],
  "vibe": "A luxurious description of the visual theme/vibe (1 sentence)",
  "matchingCatalogProductIds": ["Choose 1 or 2 matching product IDs from StoreHub catalog that correspond to this look"],
  "stylingTip": "A professional styling tip on how to elevate or wear this look"
}

StoreHub Catalog for matching:
${JSON.stringify(currentProducts, null, 2)}`;

    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: cleanBase64
          }
        },
        { text: prompt }
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    const textResult = response.text || "{}";
    const parsedData = JSON.parse(textResult.trim());
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error in visual search:", error);
    res.status(500).json({ error: error.message || "Failed to analyze image style" });
  }
});

// -------------------------------------------------------------
// Vite Middleware & Static Serving Setup
// -------------------------------------------------------------
async function startServer() {
  // Run database seeding on start
  try {
    console.log("Initializing database connection...");
    await seedDatabaseIfNeeded();
  } catch (err) {
    console.error("Failed to seed database on startup:", err);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
