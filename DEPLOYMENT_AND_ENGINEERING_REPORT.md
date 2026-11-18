# Stylah Designs & Interiors — Deployment, Build & Configuration Guide

## 1. Shared Firebase Backend (`promising-voyage-33kqt`)
- **Brand**: Stylah Designs & Interiors (*Transforming Walls, Elevating Spaces.*)
- **Official Email**: `stylahindustries297@gmail.com`
- **WhatsApp Business Line**: `+254 745 280 011` (`254745280011`)
- **Firestore Database ID**: `ai-studio-71c477a0-5e33-4d2e-b5e0-66e3c02d5593`
- **Storage Bucket**: `promising-voyage-33kqt.firebasestorage.app`
- **Authorized Administrators (`email_verified == true`)**:
  - Primary Owner Admin: `stylahindustries297@gmail.com`
  - IT Administrator: `josephngotho988@gmail.com`
- **Hardened Rules**: Deployed from `firestore.rules` (and Storage rules in `storage.rules`).
- **Action Required in Firebase Console**:
  1. Open **Authentication -> Sign-in method** in Firebase Console for `promising-voyage-33kqt` and enable **Email/Password** alongside **Google**.
  2. Sign in to the web app with either verified admin email (`stylahindustries297@gmail.com` or `josephngotho988@gmail.com`) and open **Admin -> Overview -> Publish Starter Catalog & Demo Portfolio** to seed Firestore with the editable starter catalog and `STYLAH10` promo code.
  3. Use **Admin -> Storefront Customizer** to customize the hero banner photo, headline, announcement bar, brand logo, WhatsApp number, email, showroom location, and delivery fees live.
  4. Use **Admin -> Products & Photos / Services & Photos / Portfolio & Photos / Categories & Promos** to upload photography and manage inventory and discount codes.

## 2. Environment Variables (Server-Side Only)
Configure these in Cloud Run / hosting secrets (never commit real keys):
- `APP_URL`: Public HTTPS origin of the web server.
- `MPESA_ENV`: `sandbox` or `production`
- `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`: Safaricom Daraja API credentials.
- `RESEND_API_KEY`, `EMAIL_FROM`: Transactional email delivery credentials.
- `WHATSAPP_BUSINESS_NUMBER`: Defaults to `254745280011`.
- `SUPPORT_EMAIL`: Defaults to `stylahindustries297@gmail.com`.

## 3. Web Deployment
```bash
npm install
npm run build
npm start
```
The Express server (`server.ts`) serves static assets from `dist/`, exposes `/api/*` endpoints, `/sitemap.xml`, `/robots.txt`, and `/manifest.webmanifest` on port `3000`.

## 4. Native Android APK & AAB Build Instructions (`/android`)
1. In Firebase Console (`promising-voyage-33kqt`), register an Android app with package name `com.stylah.platform` and download `google-services.json` into `/android/app/google-services.json`.
2. Open `/android` in Android Studio Ladybug+ (JDK 17, Android SDK 35).
3. Build a **Debug APK**:
   ```bash
   cd android && ./gradlew assembleDebug
   ```
   Output: `android/app/build/outputs/apk/debug/app-debug.apk`
4. Configure release signing by creating `/android/keystore.properties` (never commit to git):
   ```properties
   storeFile=/path/to/stylah-release.jks
   storePassword=YOUR_STORE_PASSWORD
   keyAlias=stylah
   keyPassword=YOUR_KEY_PASSWORD
   ```
5. Build a **Release APK** or **Play Store App Bundle (AAB)**:
   ```bash
   cd android && ./gradlew assembleRelease bundleRelease
   ```
   Outputs: `app-release.apk` and `app-release.aab`.
