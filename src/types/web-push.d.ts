declare module 'web-push' {
  export interface VapidKeys {
    publicKey: string;
    privateKey: string;
  }

  export interface PushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  export interface SendResult {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  }

  export interface RequestOptions {
    gcmAPIKey?: string;
    vapidDetails?: {
      subject: string;
      publicKey: string;
      privateKey: string;
    };
    timeout?: number;
    TTL?: number;
    headers?: Record<string, string>;
    contentEncoding?: string;
    urgency?: 'very-low' | 'low' | 'normal' | 'high';
    topic?: string;
  }

  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;

  export function setGCMAPIKey(apiKey: string): void;

  export function generateVAPIDKeys(): VapidKeys;

  export function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer | null,
    options?: RequestOptions
  ): Promise<SendResult>;

  export function encrypt(
    userPublicKey: string,
    userAuth: string,
    payload: Buffer | string,
    contentEncoding?: string
  ): { localPublicKey: string; salt: string; cipherText: Buffer };

  export function getVapidHeaders(
    audience: string,
    subject: string,
    publicKey: string,
    privateKey: string,
    contentEncoding?: string,
    expiration?: number
  ): { Authorization: string; 'Crypto-Key': string };

  export default {
    setVapidDetails,
    setGCMAPIKey,
    generateVAPIDKeys,
    sendNotification,
    encrypt,
    getVapidHeaders,
  };
}
