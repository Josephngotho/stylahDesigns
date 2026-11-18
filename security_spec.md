# Stylah Designer & Tech Firm — Firestore Security Specification (Phase 0 TDD)

## 1. Core Data Invariants
1. **No Self-Promotion**: A customer creating or updating `/users/{userId}` can never set `role` to `'admin'` or `'staff'`, nor write to `/admins/{uid}` or `/staff/{uid}`.
2. **PII Isolation**: Emails, Kenyan phone numbers, delivery addresses, and FCM tokens are stored under `/users/{userId}/private/info` and owner-gated collections (`/orders`, `/bookings`), never exposed via blanket `allow read: if isSignedIn()`.
3. **Order Integrity**: Customers can create `/orders/{orderId}` only with `customerId == request.auth.uid`, `paymentStatus` in `['unpaid', 'pending']`, and `orderStatus` in `['pending', 'awaiting_payment']`. Customers cannot mark an order `'paid'` or `'delivered'`.
4. **Master Gate on Subcollections**: `/orders/{orderId}/items/{itemId}` verifies parent `/orders/{orderId}` exists and belongs to `request.auth.uid` (or `isStaff()`).
5. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps on protected writes must equal `request.time`.
6. **Terminal State Locking**: Once an order reaches `delivered` or `cancelled`, or a booking reaches `completed` or `cancelled`, non-admin users cannot alter it.
7. **ID Poisoning Guard**: Every single-document operation validates `isValidId(docId)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).
8. **Query Enforcer**: Every `allow list` on private collections enforces `resource.data.customerId == request.auth.uid` or `resource.data.userId == request.auth.uid` (or `isStaff()`).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Role Escalation on Registration**: Customer attempts `create` on `/users/uid1` with `{ role: "admin" }` -> `PERMISSION_DENIED`.
2. **Role Escalation on Profile Update**: Customer attempts `update` on `/users/uid1` changing `role` to `"staff"` -> `PERMISSION_DENIED`.
3. **Email Spoofing Admin Bypass**: Unauthenticated or unverified token with `email: "josephngotho988@gmail.com"` and `email_verified: false` attempts admin product write -> `PERMISSION_DENIED`.
4. **Shadow Field Injection**: Customer includes `{ isVerified: true, discountOverride: 99 }` in `/orders/ord1` -> `PERMISSION_DENIED` (`hasOnly` check).
5. **Cross-User Order Scraping**: Authenticated user `uid2` runs `list` on `/orders` without `customerId == 'uid2'` -> `PERMISSION_DENIED`.
6. **Cross-User PII Read**: Authenticated user `uid2` runs `get` on `/users/uid1/private/info` -> `PERMISSION_DENIED`.
7. **Self-Marking Order Paid**: Customer creates `/orders/ord2` with `paymentStatus: "paid"` or updates `paymentStatus` to `"paid"` -> `PERMISSION_DENIED`.
8. **Orphaned Booking Creation**: Customer creates `/bookings/bk1` referencing a nonexistent `serviceId: "fake_service"` -> `PERMISSION_DENIED` (`exists()` check).
9. **ID Poisoning Attack**: Attacker targets `/products/../../../../etc/passwd` or a 500-char ID -> `PERMISSION_DENIED` (`isValidId` check).
10. **Terminal Order Mutation**: Customer attempts to update a `'delivered'` order back to `'pending'` -> `PERMISSION_DENIED`.
11. **Backdated Timestamp Spoofing**: Customer creates `/bookings/bk2` with `createdAt` set to yesterday instead of `request.time` -> `PERMISSION_DENIED`.
12. **Audit Log Tampering**: Staff or customer attempts to `update` or `delete` `/auditLogs/log1` -> `PERMISSION_DENIED`.
