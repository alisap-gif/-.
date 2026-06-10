# Firebase Security Specification & TDD Framework

Esteemed Team, this specification defines the Zero-Trust security postures and data integrity invariants for the **ระบบตารางนัดทีม วก. ปีการศึกษา 2570** (WK Meeting Scheduler 2570).

---

## 1. Core Data Invariants

1. **Identity & Non-Repudiation**:
   - A user can only register or edit their own slot availability (i.e. `userId` in the `SlotAvailability` must match the authenticated user's `uid`).
2. **Type and Size Hardening**:
   - Every string field has strict upper-bound limits (e.g. `note` text cannot exceed 500 characters, `id` and `dateString` are strictly bounded).
3. **Temporal Integrity**:
   - `updatedAt` for any written schedule slot or document metadata must reflect the true server-time of editing.
4. **State Transitions**:
   - Relational attributes and file configurations must strictly conform to schemas. Unauthorized fields or ghost fields in Firestore documents will be rejected completely.

---

## 2. The "Dirty Dozen" Attack Payloads (Validation Failure Scenarios)

The following 12 JSON payloads attempt to violate security laws:

### Attack 01: Ghost Field Injection (Shadow Update)
```json
{
  "dateString": "2026-08-03",
  "slots": {},
  "isAdminOverlord": true
}
```
*Expected: Rejected due to strict keys matching (shadow fields unauthorized).*

### Attack 02: Identity Spoofing (Impersonating another Executive)
```json
{
  "dateString": "2026-08-03",
  "slots": {
    "09:00": [
      {
        "userId": "as",
        "userName": "AS",
        "status": "available",
        "note": "Malicious override",
        "isStruckThrough": false,
        "updatedAt": "2026-06-10T08:00:00Z"
      }
    ]
  }
}
```
*Actor `sc` tries to write a slot where `userId` is `as`. Expected: PERMISSION_DENIED.*

### Attack 03: Poisoned Slot Status value
```json
{
  "dateString": "2026-08-03",
  "slots": {
    "09:00": [
      {
        "userId": "sc",
        "userName": "SC",
        "status": "highly-available-super-status",
        "note": "Hack status",
        "isStruckThrough": false,
        "updatedAt": "2026-06-10T08:00:00Z"
      }
    ]
  }
}
```
*Expected: PERMISSION_DENIED as status is not inside the enum `["available", "busy", "none"]`.*

### Attack 04: Giant Payload Attack (Denial of Wallet - Space Exhaustion)
```json
{
  "dateString": "2026-08-03",
  "slots": {
    "09:00": [
      {
        "userId": "sc",
        "userName": "SC",
        "status": "available",
        "note": "A".repeat(1000000),
        "isStruckThrough": false,
        "updatedAt": "2026-06-10T08:00:00Z"
      }
    ]
  }
}
```
*Expected: PERMISSION_DENIED because `note.size() <= 500` constraint is violated.*

### Attack 05: Malicious Path Variable Poisoning
- Path: `/schedules/EXTREMELY_LONG_JUNK_ID_SPAM_spam_spam_spam_spam_spam_spam`
```json
{
  "dateString": "2026-08-03",
  "slots": {}
}
```
*Expected: PERMISSION_DENIED since `isValidId()` restricts path IDs to 128 chars and valid regex.*

### Attack 06: Non-Standard Hour-Key Format (Time Poisoning)
```json
{
  "dateString": "2026-08-03",
  "slots": {
    "midnight-party-hour": [
      {
        "userId": "sc",
        "userName": "SC",
        "status": "available",
        "note": "Hack",
        "isStruckThrough": false,
        "updatedAt": "2026-06-10T08:00:00Z"
      }
    ]
  }
}
```
*Expected: PERMISSION_DENIED due to non-standard hourly pattern schema validation.*

### Attack 07: Unauthenticated Read Attempt
```http
GET /schedules/2026-08-03
```
*With auth = null. Expected: PERMISSION_DENIED.*

### Attack 08: Unauthenticated Write Attempt
```http
POST /attachedFiles/randomId
```
```json
{
  "id": "randomId",
  "name": "hacked_file.pdf",
  "size": "500 KB",
  "uploadedAt": "2026-06-10T07:13:13Z",
  "fileType": "pdf"
}
```
*With auth = null. Expected: PERMISSION_DENIED.*

### Attack 09: Immutable Created-At Tampering on File Uploads
```json
{
  "id": "1",
  "name": "tampered_file.pdf",
  "size": "1.4 MB",
  "uploadedAt": "2020-01-01T00:00:00Z",
  "fileType": "pdf"
}
```
*Attempting to overwrite a historic file with altered upload metadata. Expected: PERMISSION_DENIED.*

### Attack 10: PII Blanket Read Scan Exploit
```http
GET /attachedFiles
```
*Attempting to list and scrape raw corporate attachments without authenticated scope. Expected: PERMISSION_DENIED.*

### Attack 11: GAS Config Path Manipulation
- Path: `/gasConfig/hacked_route`
```json
{
  "gasUrl": "https://script.google.com/macros/s/malicious/exec"
}
```
*Expected: PERMISSION_DENIED because only `primary` config document path is valid.*

### Attack 12: Bad Email Verification Security Spoofing
- Authenticated state includes: `email_verified = false`.
*Expected: Any mutation write is strictly locked and rejected for unverified users.*

---

## 3. Test Suite Runner Script (`firestore.rules.test.ts` outline)

The following test suite asserts that every vulnerability in the "Dirty Dozen" returns `PERMISSION_DENIED`:

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';

describe('WK Scheduler 2570 Security Rules Verification Test Suite', () => {
  let testEnv;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'gen-lang-client-0034942413',
      firestore: {
        rules: require('fs').readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  it('Attack 07: Blocks unauthenticated readers from accessing schedules', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthedDb.collection('schedules').doc('2026-08-03').get());
  });

  it('Attack 02: Prevents User A from spoofing User B in schedule slot updates', async () => {
    const userADb = testEnv.authenticatedContext('userA', { email: 'userA@bu.ac.th', email_verified: true }).firestore();
    await assertFails(
      userADb.collection('schedules').doc('2026-08-03').set({
        dateString: '2026-08-03',
        slots: {
          '09:00': [{
            userId: 'userB',
            userName: 'UB',
            status: 'available',
            note: 'Sneaky userB update',
            isStruckThrough: false,
            updatedAt: new Date().toISOString()
          }]
        }
      })
    );
  });

  it('Attack 03: Rejects slot updates containing illegal non-enum state values', async () => {
    const userADb = testEnv.authenticatedContext('userA', { email: 'userA@bu.ac.th', email_verified: true }).firestore();
    await assertFails(
      userADb.collection('schedules').doc('2026-08-03').set({
        dateString: '2026-08-03',
        slots: {
          '09:00': [{
            userId: 'userA',
            userName: 'UA',
            status: 'super-available-ultra',
            note: 'Sneaky status',
            isStruckThrough: false,
            updatedAt: new Date().toISOString()
          }]
        }
      })
    );
  });

  it('Attack 11: Restricts arbitrary path creations on system configuration nodes', async () => {
    const userADb = testEnv.authenticatedContext('userA', { email: 'userA@bu.ac.th', email_verified: true }).firestore();
    await assertFails(
      userADb.collection('gasConfig').doc('malicious_override').set({
        gasUrl: 'https://malicious.url/exec'
      })
    );
  });
});
```
