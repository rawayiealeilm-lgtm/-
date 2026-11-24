# Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. Public religious content collections (`site_posts`, `site_fatawa`, `mother_oasis_items`, `poetry_items`, `deaf_mute_videos`, `custom_adhkar`, `library_books`, `site_settings`) are publicly readable only when non-sensitive and must ONLY be created, updated, or deleted by verified admins (`isAdmin()`).
2. No personal admin contact info (email, phone, WhatsApp) or PII is ever stored inside public content collections.
3. All document IDs must strictly satisfy `^[a-zA-Z0-9_-]+$` and length `<= 128`.
4. Every string field enforces strict `.size()` upper bounds, and all allowed keys are locked via `hasAll` + `hasOnly` (no shadow/ghost fields).
5. Visitor reviews (`visitor_reviews`) can be created by signed-in or unauthenticated visitors ONLY with `hidden == false`, `rating` in `1..5`, valid lengths, and `createdAt == request.time`; updates/deletes are restricted strictly to `isAdmin()`.
6. Timestamps (`createdAt` on create, `updatedAt` on update) are strictly validated against `request.time`, and `createdAt` is immutable on update.
7. Default catch-all rule denies all unspecified paths (`allow read, write: if false;`).

## 2. The "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated write to `/site_posts/p1` -> DENIED.
2. Verified non-admin user write to `/site_fatawa/f1` -> DENIED.
3. Unverified email (`email_verified: false`) pretending to be admin email -> DENIED.
4. Shadow field injection (`isAdmin: true` or `ghost: 1`) on `/site_posts/p2` -> DENIED.
5. Oversized `body` (> 30KB) resource-exhaustion payload -> DENIED.
6. Invalid document ID (`bad..id/../../x`) -> DENIED.
7. Self-privilege escalation write to `/admins/attacker_uid` -> DENIED.
8. Tampering with immutable `createdAt` on `/mother_oasis_items/m1` update -> DENIED.
9. Visitor forging `createdAt` timestamp in the past on `/visitor_reviews/r1` -> DENIED.
10. Visitor creating pre-hidden or out-of-range rating (`rating: 99`) review -> DENIED.
11. Non-admin deleting or hiding a visitor review on `/visitor_reviews/r1` -> DENIED.
12. Querying or writing to an unlisted collection `/private_notes/n1` -> DENIED.
