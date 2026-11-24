/**
 * Phase 0 Dirty Dozen Firestore Rules Test Suite Reference
 * Verifies all 12 adversarial attack vectors against DRAFT_firestore.rules / firestore.rules.
 */
export const DIRTY_DOZEN_ASSERTIONS = [
  '1. Unauthenticated write to /site_posts/p1 -> PERMISSION_DENIED',
  '2. Verified non-admin user write to /site_fatawa/f1 -> PERMISSION_DENIED',
  '3. Unverified email pretending to be admin email -> PERMISSION_DENIED',
  '4. Shadow field injection on /site_posts/p2 -> PERMISSION_DENIED',
  '5. Oversized body (>30KB) resource exhaustion -> PERMISSION_DENIED',
  '6. Invalid document ID format -> PERMISSION_DENIED',
  '7. Self-privilege escalation write to /admins/uid -> PERMISSION_DENIED',
  '8. Tampering with immutable createdAt on update -> PERMISSION_DENIED',
  '9. Forged createdAt timestamp on visitor review -> PERMISSION_DENIED',
  '10. Out-of-range rating or pre-hidden visitor review -> PERMISSION_DENIED',
  '11. Non-admin hiding/deleting visitor review -> PERMISSION_DENIED',
  '12. Unlisted collection /private_notes/n1 access -> PERMISSION_DENIED',
] as const;
