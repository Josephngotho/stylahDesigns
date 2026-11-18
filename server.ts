import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebaseAppletConfig {
  projectId: string;
  firestoreDatabaseId?: string;
}

const firebaseConfigPath = path.resolve(__dirname, 'firebase-applet-config.json');
const firebaseConfig: FirebaseAppletConfig = fs.existsSync(firebaseConfigPath)
  ? JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'))
  : { projectId: process.env.FIREBASE_PROJECT_ID || '' };

if (firebaseConfig.projectId && firebaseConfig.projectId !== 'remixed-project-id') {
  if (!getApps().length) {
    initializeApp({ projectId: firebaseConfig.projectId });
  }
}

// -----------------------------------------------------------------------------
// Security & Validation Helpers
// -----------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip || 'unknown'}:${req.path}`;
    const now = Date.now();
    const record = rateLimitMap.get(key);
    if (!record || now > record.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (record.count >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }
    record.count += 1;
    return next();
  };
}

interface AuthedRequest extends Request {
  user?: DecodedIdToken;
}

async function requireFirebaseAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Invalid Bearer token.' });
  }
  try {
    const decoded = await getAuth(getApp()).verifyIdToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired Firebase authentication token.',
      details: err instanceof Error ? err.message : 'Token verification failed',
    });
  }
}

function normalizeKenyanPhone(raw: string): { e164: string; msisdn: string } | null {
  const cleaned = raw.replace(/[\s\-()]/g, '');
  if (/^\+254[17]\d{8}$/.test(cleaned)) {
    return { e164: cleaned, msisdn: cleaned.slice(1) };
  }
  if (/^254[17]\d{8}$/.test(cleaned)) {
    return { e164: `+${cleaned}`, msisdn: cleaned };
  }
  if (/^0[17]\d{8}$/.test(cleaned)) {
    return { e164: `+254${cleaned.slice(1)}`, msisdn: `254${cleaned.slice(1)}` };
  }
  return null;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// -----------------------------------------------------------------------------
// Firestore Public REST Reader (No IAM needed for published public docs)
// -----------------------------------------------------------------------------
interface FirestoreFieldValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
}

function getFirestoreBaseUrl(): string | null {
  if (!firebaseConfig.projectId || firebaseConfig.projectId === 'remixed-project-id') {
    return null;
  }
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  return `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents`;
}

async function fetchPublicDoc(collectionName: string, docId: string): Promise<Record<string, FirestoreFieldValue> | null> {
  const baseUrl = getFirestoreBaseUrl();
  if (!baseUrl) return null;
  try {
    const resp = await fetch(`${baseUrl}/${collectionName}/${encodeURIComponent(docId)}`);
    if (!resp.ok) return null;
    const data = (await resp.json()) as { fields?: Record<string, FirestoreFieldValue> };
    return data.fields || null;
  } catch {
    return null;
  }
}

async function fetchPublishedPromotion(code: string): Promise<number> {
  const baseUrl = getFirestoreBaseUrl();
  const normalizedCode = code.trim().toUpperCase();
  if (!baseUrl || !normalizedCode) return 0;
  try {
    const resp = await fetch(`${baseUrl}/promotions?pageSize=50`);
    if (!resp.ok) return 0;
    const data = (await resp.json()) as {
      documents?: Array<{ fields?: Record<string, FirestoreFieldValue> }>;
    };
    const match = (data.documents || []).find(
      (doc) =>
        doc.fields?.published?.booleanValue === true &&
        (doc.fields?.code?.stringValue || '').trim().toUpperCase() === normalizedCode
    );
    if (!match?.fields) return 0;
    const pct =
      match.fields.discountPercent?.doubleValue ??
      (match.fields.discountPercent?.integerValue ? Number(match.fields.discountPercent.integerValue) : 0);
    return pct > 0 && pct <= 90 ? pct : 0;
  } catch {
    return 0;
  }
}

async function fetchPublicCollectionSlugs(collectionName: string): Promise<string[]> {
  const baseUrl = getFirestoreBaseUrl();
  if (!baseUrl) return [];
  try {
    const resp = await fetch(`${baseUrl}/${collectionName}?pageSize=100`);
    if (!resp.ok) return [];
    const data = (await resp.json()) as {
      documents?: Array<{ fields?: Record<string, FirestoreFieldValue> }>;
    };
    return (data.documents || [])
      .filter((doc) => doc.fields?.published?.booleanValue === true)
      .map((doc) => doc.fields?.slug?.stringValue)
      .filter((slug): slug is string => Boolean(slug));
  } catch {
    return [];
  }
}

// -----------------------------------------------------------------------------
// M-Pesa Daraja Helpers & Idempotent Transaction Ledger
// -----------------------------------------------------------------------------
interface MpesaStatusRecord {
  checkoutRequestId: string;
  merchantRequestId: string;
  orderId: string;
  orderRef: string;
  amountKsh: number;
  phoneMsisdn: string;
  status: 'pending' | 'completed' | 'failed';
  mpesaReceiptNumber?: string;
  resultDesc?: string;
  updatedAt: string;
}

const mpesaLedger = new Map<string, MpesaStatusRecord>();

function isMpesaConfigured(): boolean {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY
  );
}

function getMpesaBaseUrl(): string {
  return process.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
}

function formatDarajaTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

async function getDarajaAccessToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY || '';
  const secret = process.env.MPESA_CONSUMER_SECRET || '';
  const basicAuth = Buffer.from(`${key}:${secret}`).toString('base64');
  const resp = await fetch(`${getMpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${basicAuth}` },
  });
  if (!resp.ok) {
    throw new Error(`Daraja OAuth failed with HTTP ${resp.status}`);
  }
  const json = (await resp.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error('Daraja OAuth response missing access_token');
  }
  return json.access_token;
}

// -----------------------------------------------------------------------------
// Server Setup
// -----------------------------------------------------------------------------
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  // Health & Public Config
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'stylah-platform-api',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/config/public', (_req, res) => {
    res.json({
      mpesaConfigured: isMpesaConfigured(),
      mpesaEnv: process.env.MPESA_ENV === 'production' ? 'production' : 'sandbox',
      emailConfigured: Boolean(process.env.RESEND_API_KEY),
      whatsappNumber: process.env.WHATSAPP_BUSINESS_NUMBER || '254745280011',
      supportEmail: process.env.SUPPORT_EMAIL || 'stylahindustries297@gmail.com',
      appUrl: process.env.APP_URL || '',
    });
  });

  // Server-Side Order Price Validation (Prevents client-side price tampering)
  app.post('/api/orders/validate', rateLimit(30, 60_000), requireFirebaseAuth, async (req: AuthedRequest, res) => {
    try {
      const { items, deliveryTown, promoCode } = req.body as {
        items?: Array<{ productId: string; quantity: number }>;
        deliveryTown?: string;
        promoCode?: string;
      };

      if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
        return res.status(400).json({ error: 'Order must include between 1 and 50 line items.' });
      }

      let subtotalKsh = 0;
      const validatedItems: Array<{ productId: string; unitPriceKsh: number; quantity: number; lineTotalKsh: number }> = [];

      for (const item of items) {
        if (!item?.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) {
          return res.status(400).json({ error: 'Invalid product ID or quantity in cart.' });
        }
        const docFields = await fetchPublicDoc('products', item.productId);
        if (!docFields || docFields.published?.booleanValue !== true) {
          return res.status(400).json({ error: `Product ${item.productId} is unavailable.` });
        }
        const rawDiscount =
          docFields.discountedPriceKsh?.doubleValue ??
          (docFields.discountedPriceKsh?.integerValue ? Number(docFields.discountedPriceKsh.integerValue) : 0);
        const rawPrice =
          docFields.priceKsh?.doubleValue ??
          (docFields.priceKsh?.integerValue ? Number(docFields.priceKsh.integerValue) : 0);

        const unitPriceKsh = rawDiscount > 0 && rawDiscount < rawPrice ? rawDiscount : rawPrice;
        if (!unitPriceKsh || unitPriceKsh <= 0) {
          return res.status(400).json({ error: `Invalid pricing for product ${item.productId}.` });
        }

        const lineTotalKsh = Math.round(unitPriceKsh * item.quantity);
        subtotalKsh += lineTotalKsh;
        validatedItems.push({
          productId: item.productId,
          unitPriceKsh,
          quantity: item.quantity,
          lineTotalKsh,
        });
      }

      const promoPercent = promoCode ? await fetchPublishedPromotion(promoCode) : 0;
      const discountKsh = promoPercent > 0 ? Math.round((subtotalKsh * promoPercent) / 100) : 0;
      const discountedSubtotal = Math.max(0, subtotalKsh - discountKsh);

      // Check public delivery settings or fall back to safe defaults
      const settingsFields = await fetchPublicDoc('settings', 'public');
      const standardFee =
        settingsFields?.standardDeliveryFeeKsh?.doubleValue ??
        (settingsFields?.standardDeliveryFeeKsh?.integerValue ? Number(settingsFields.standardDeliveryFeeKsh.integerValue) : 650);
      const freeThreshold =
        settingsFields?.freeDeliveryThresholdKsh?.doubleValue ??
        (settingsFields?.freeDeliveryThresholdKsh?.integerValue
          ? Number(settingsFields.freeDeliveryThresholdKsh.integerValue)
          : 25000);

      const normalizedTown = (deliveryTown || '').trim().toLowerCase();
      const isOutsideNairobi = normalizedTown && !normalizedTown.includes('nairobi') && !normalizedTown.includes('kiambu');
      const baseFee = isOutsideNairobi ? Math.max(standardFee, 1200) : standardFee;
      const deliveryFeeKsh = discountedSubtotal >= freeThreshold ? 0 : baseFee;

      return res.json({
        verified: true,
        items: validatedItems,
        subtotalKsh,
        deliveryFeeKsh,
        discountKsh,
        promoApplied: promoPercent > 0 ? promoCode?.trim().toUpperCase() : null,
        totalKsh: Math.max(1, discountedSubtotal + deliveryFeeKsh),
      });
    } catch (err) {
      return res.status(500).json({
        error: 'Failed to validate order totals.',
        details: err instanceof Error ? err.message : 'Server error',
      });
    }
  });

  // M-Pesa Daraja STK Push Initiation
  app.post('/api/mpesa/stkpush', rateLimit(15, 60_000), requireFirebaseAuth, async (req: AuthedRequest, res) => {
    try {
      const { orderId, orderRef, phoneNumber, amountKsh } = req.body as {
        orderId?: string;
        orderRef?: string;
        phoneNumber?: string;
        amountKsh?: number;
      };

      if (!orderId || !orderRef || !phoneNumber || typeof amountKsh !== 'number' || amountKsh <= 0) {
        return res.status(400).json({ error: 'orderId, orderRef, phoneNumber, and positive amountKsh are required.' });
      }

      const phone = normalizeKenyanPhone(phoneNumber);
      if (!phone) {
        return res.status(400).json({ error: 'Invalid Kenyan mobile number. Use +2547XXXXXXXX or 07XXXXXXXX.' });
      }

      if (!isMpesaConfigured()) {
        return res.status(503).json({
          configured: false,
          code: 'MPESA_CREDENTIALS_MISSING',
          message:
            'M-Pesa Daraja credentials (MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY) are not configured on the server yet. Your order has been saved as awaiting payment.',
        });
      }

      const shortCode = process.env.MPESA_SHORTCODE || '';
      const passKey = process.env.MPESA_PASSKEY || '';
      const timestamp = formatDarajaTimestamp();
      const password = Buffer.from(`${shortCode}${passKey}${timestamp}`).toString('base64');
      const callbackUrl =
        process.env.MPESA_CALLBACK_URL ||
        `${(process.env.APP_URL || '').replace(/\/$/, '')}/api/mpesa/callback`;

      const accessToken = await getDarajaAccessToken();
      const roundedAmount = Math.max(1, Math.round(amountKsh));

      const stkPayload = {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: roundedAmount,
        PartyA: phone.msisdn,
        PartyB: shortCode,
        PhoneNumber: phone.msisdn,
        CallBackURL: callbackUrl,
        AccountReference: orderRef.slice(0, 12),
        TransactionDesc: `Stylah Order ${orderRef}`.slice(0, 20),
      };

      const darajaResp = await fetch(`${getMpesaBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stkPayload),
      });

      const darajaData = (await darajaResp.json()) as {
        MerchantRequestID?: string;
        CheckoutRequestID?: string;
        ResponseCode?: string;
        ResponseDescription?: string;
        CustomerMessage?: string;
        errorMessage?: string;
      };

      if (!darajaResp.ok || darajaData.ResponseCode !== '0' || !darajaData.CheckoutRequestID) {
        return res.status(400).json({
          error: darajaData.errorMessage || darajaData.ResponseDescription || 'Failed to initiate M-Pesa STK Push.',
          darajaData,
        });
      }

      mpesaLedger.set(darajaData.CheckoutRequestID, {
        checkoutRequestId: darajaData.CheckoutRequestID,
        merchantRequestId: darajaData.MerchantRequestID || '',
        orderId,
        orderRef,
        amountKsh: roundedAmount,
        phoneMsisdn: phone.msisdn,
        status: 'pending',
        updatedAt: new Date().toISOString(),
      });

      return res.json({
        configured: true,
        initiated: true,
        checkoutRequestId: darajaData.CheckoutRequestID,
        merchantRequestId: darajaData.MerchantRequestID,
        customerMessage: darajaData.CustomerMessage || 'Check your phone and enter your M-Pesa PIN to complete payment.',
      });
    } catch (err) {
      return res.status(500).json({
        error: 'M-Pesa STK Push error.',
        details: err instanceof Error ? err.message : 'Unexpected server failure',
      });
    }
  });

  // M-Pesa Daraja Callback Receiver (Idempotent)
  app.post('/api/mpesa/callback', (req, res) => {
    try {
      const stkCallback = req.body?.Body?.stkCallback as
        | {
            MerchantRequestID?: string;
            CheckoutRequestID?: string;
            ResultCode?: number;
            ResultDesc?: string;
            CallbackMetadata?: { Item?: Array<{ Name: string; Value?: string | number }> };
          }
        | undefined;

      if (!stkCallback?.CheckoutRequestID) {
        return res.status(400).json({ ResultCode: 1, ResultDesc: 'Invalid callback payload' });
      }

      const existingRecord = mpesaLedger.get(stkCallback.CheckoutRequestID);
      if (existingRecord && existingRecord.status !== 'pending') {
        // Idempotent guard: already processed
        return res.json({ ResultCode: 0, ResultDesc: 'Already processed' });
      }

      const items = stkCallback.CallbackMetadata?.Item || [];
      const receiptItem = items.find((i) => i.Name === 'MpesaReceiptNumber');
      const receipt = receiptItem?.Value ? String(receiptItem.Value) : undefined;

      const updated: MpesaStatusRecord = {
        checkoutRequestId: stkCallback.CheckoutRequestID,
        merchantRequestId: stkCallback.MerchantRequestID || existingRecord?.merchantRequestId || '',
        orderId: existingRecord?.orderId || '',
        orderRef: existingRecord?.orderRef || '',
        amountKsh: existingRecord?.amountKsh || 0,
        phoneMsisdn: existingRecord?.phoneMsisdn || '',
        status: stkCallback.ResultCode === 0 ? 'completed' : 'failed',
        mpesaReceiptNumber: receipt,
        resultDesc: stkCallback.ResultDesc || '',
        updatedAt: new Date().toISOString(),
      };

      mpesaLedger.set(stkCallback.CheckoutRequestID, updated);
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch {
      return res.status(500).json({ ResultCode: 1, ResultDesc: 'Callback error' });
    }
  });

  app.get('/api/mpesa/status/:checkoutRequestId', requireFirebaseAuth, (req, res) => {
    const id = String(req.params.checkoutRequestId || '');
    const record = mpesaLedger.get(id);
    if (!record) {
      return res.status(404).json({ error: 'Transaction reference not found.' });
    }
    return res.json(record);
  });

  // Server-Side Transactional Email Notification Endpoint
  app.post('/api/notifications/email', rateLimit(20, 60_000), requireFirebaseAuth, async (req, res) => {
    const { to, subject, text } = req.body as { to?: string; subject?: string; text?: string };
    if (!to || !subject || !text) {
      return res.status(400).json({ error: 'Missing required email fields (to, subject, text).' });
    }
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        sent: false,
        configured: false,
        message: 'Transactional email skipped because RESEND_API_KEY is not configured in server environment.',
      });
    }
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Stylah Designer & Tech Firm <onboarding@resend.dev>',
          to: [to],
          subject: subject.slice(0, 140),
          text: text.slice(0, 4000),
        }),
      });
      if (!resp.ok) {
        const body = await resp.text();
        return res.status(502).json({ sent: false, configured: true, error: body });
      }
      const data = await resp.json();
      return res.json({ sent: true, configured: true, data });
    } catch (err) {
      return res.status(500).json({
        sent: false,
        error: err instanceof Error ? err.message : 'Email delivery error',
      });
    }
  });

  // Dynamic robots.txt
  app.get('/robots.txt', (req, res) => {
    const hostUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /account',
        'Disallow: /checkout',
        'Disallow: /admin',
        'Disallow: /api/',
        `Sitemap: ${hostUrl}/sitemap.xml`,
      ].join('\n')
    );
  });

  // Dynamic sitemap.xml from published Firestore public items
  app.get('/sitemap.xml', async (req, res) => {
    const hostUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const [productSlugs, serviceSlugs, projectSlugs] = await Promise.all([
      fetchPublicCollectionSlugs('products'),
      fetchPublicCollectionSlugs('services'),
      fetchPublicCollectionSlugs('projects'),
    ]);

    const staticPaths = ['/', '/shop', '/services', '/portfolio', '/contact'];
    const dynamicPaths = [
      ...productSlugs.map((slug) => `/shop/${slug}`),
      ...serviceSlugs.map((slug) => `/services/${slug}`),
      ...projectSlugs.map((slug) => `/portfolio/${slug}`),
    ];

    const allUrls = [...new Set([...staticPaths, ...dynamicPaths])];
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...allUrls.map(
        (u) =>
          `  <url><loc>${escapeXml(`${hostUrl}${u}`)}</loc><changefreq>${
            u === '/' ? 'daily' : 'weekly'
          }</changefreq></url>`
      ),
      '</urlset>',
    ].join('\n');

    res.type('application/xml').send(xml);
  });

  // Vite Dev Middleware or Production Static Dist
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Stylah Designer & Tech Firm server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
