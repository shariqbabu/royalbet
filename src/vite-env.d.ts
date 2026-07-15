/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly FIREBASE_PROJECT_ID: string;
  readonly FIREBASE_PRIVATE_KEY: string;
  readonly FIREBASE_CLIENT_EMAIL: string;
 
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
