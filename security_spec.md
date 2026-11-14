# SHE-GUARD Firestore Security Specification

## 1. Data Invariants
1. **Strict Ownership & PII Isolation**: Every user profile (`/users/{userId}`) and subcollection (`/users/{userId}/trustedContacts`, `/users/{userId}/sosAlerts`, `/users/{userId}/journeys`) contains sensitive PII (phone numbers, addresses, live GPS coordinates). Only the authenticated, email-verified owner (`request.auth.uid == userId && request.auth.token.email_verified == true`) may read, list, create, update, or delete their own documents. Collection-wide listing of `/users` is strictly denied (`allow list: if false` / no `list` rule).
2. **Master Gate Parent Existence**: No `TrustedContact`, `SosAlert`, or `JourneySession` document may be created or updated unless the parent `/users/{userId}` document exists.
3. **Immutable Ownership & Temporal Integrity**: `uid`, `userId`, `id`, and `createdAt` are immutable after creation. `createdAt` on create and `updatedAt` on both create and update must equal `request.time`.
4. **Terminal State Locking**:
   - `SosAlert.status` starts as `'recorded'` and may only transition once to `'resolved'`. Once `'resolved'`, no further updates are permitted.
   - `JourneySession.status` starts as `'active'` and may transition between `'active'` and `'checkin_missed'`, or to terminal states `'completed'` or `'escalated'`. Once `'completed'` or `'escalated'`, no further updates are permitted.
5. **Query-Side Boundary Enforcement**: All `allow list` rules on subcollections explicitly check `resource.data.userId == request.auth.uid` without `get()` or `exists()` calls.
6. **Path ID & Size Hardening**: Every document ID matches `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), and every string/number field has strict type and bounds validation.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)

1. **Cross-User Profile Read**: User B (`uid_B`) calls `get(/users/uid_A)` -> Denied.
2. **User Directory Enumeration**: Any signed-in user calls `list(/users)` -> Denied.
3. **Unverified Email Write**: User A with `email_verified: false` attempts `create(/users/uid_A, ...)` -> Denied.
4. **Identity Spoofing on Contact Create**: User A creates `/users/uid_A/trustedContacts/c1` with `userId: "uid_B"` -> Denied.
5. **Ghost Field / Shadow Update Injection**: User A updates `/users/uid_A` including an unlisted key `isAdmin: true` -> Denied.
6. **Forged Timestamp on SOS Create**: User A creates `/users/uid_A/sosAlerts/a1` with client-supplied past timestamp `createdAt` (`!= request.time`) -> Denied.
7. **Terminal State Re-opening (SOS)**: User A attempts to update `/users/uid_A/sosAlerts/a1` from `status: "resolved"` back to `status: "recorded"` -> Denied.
8. **Terminal State Re-opening (Journey)**: User A attempts to update `/users/uid_A/journeys/j1` after `status: "completed"` -> Denied.
9. **Resource Exhaustion / 1MB String Poisoning**: User A attempts to set `medicalNotes` to a 5,000-character string (`> 500`) -> Denied.
10. **Path Variable ID Poisoning**: User A attempts to create `/users/uid_A/trustedContacts/invalid$id@with!spaces` -> Denied.
11. **Unscoped List Query Scraping**: User B attempts `list(/users/uid_A/sosAlerts)` or queries without `userId == uid_B` -> Denied.
12. **Orphaned Subcollection Write**: User A attempts to create `/users/uid_A/sosAlerts/a1` when `/users/uid_A` parent document does not exist -> Denied.
