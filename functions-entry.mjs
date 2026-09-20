import { onRequest } from "firebase-functions/v2/https";
import { app } from "./server.ts";

export const api = onRequest(
  {
    region: "northamerica-northeast1",
    memory: "1GiB",
    timeoutSeconds: 120,
    maxInstances: 10,
  },
  app,
);
