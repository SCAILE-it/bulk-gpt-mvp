# 🚀 BulkGPT Power User Features - Implementation Roadmap

**Created:** 2025-10-23
**Status:** Ready to implement
**Total Effort:** ~12-14 hours
**Target Completion:** 3-4 days

---

## 📊 CURRENT STATE ASSESSMENT

### ✅ What's Already Working

**API Infrastructure (90% ready):**
- `/api/process` - Accepts Bearer token auth ✅
- `/api/tokens` - Returns session token ✅
- `/api/batch/{id}/stream` - Real-time SSE streaming ✅
- `/api/batch/{id}/status` - Status polling ✅
- `/api/export` - CSV download ✅

**Database Schema:**
- `batches` - User batches with status tracking ✅
- `batch_results` - Individual row results ✅
- `csv_uploads` - Upload tracking ✅
- `exports` - Export tracking ✅
- `error_logs` - Error tracking ✅

**Frontend:**
- CSV upload + preview ✅
- Batch processing UI ✅
- Real-time results display ✅
- Export functionality ✅

**Authentication:**
- Supabase SSR setup ✅
- Email/password auth ✅
- Session management ✅

**Processing:**
- Modal.com integration ✅
- Real-time streaming ✅
- Rate limiting (in-memory) ✅

### ❌ What's Missing

**API Access:**
- ❌ API key generation/management
- ❌ API keys database table
- ❌ API key authentication middleware

**Usage Tracking:**
- ❌ Persistent usage tracking (currently in-memory)
- ❌ Usage aggregation per user
- ❌ Monthly/daily limits enforcement

**Billing:**
- ❌ Stripe integration
- ❌ Subscription plans
- ❌ Billing database tables
- ❌ Webhook handling

**Google Sheets:**
- ❌ Google OAuth provider enabled
- ❌ Google Sheets API integration
- ❌ Sheet picker UI
- ❌ Data conversion adapter

**n8n Integration:**
- ❌ Custom n8n node package
- ❌ Node credentials
- ❌ Publishing to npm

---

## 🎯 IMPLEMENTATION PHASES

### **PHASE 1: API Keys & Usage Tracking** (4 hours)
*Priority: HIGH - Unblocks power users immediately*

#### 1.1 Database Schema (30 min)
**Files to create:**
- `supabase/migrations/003_api_keys_and_usage.sql`

**Schema:**
```sql
-- API Keys table
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_name_length CHECK (length(name) > 0 AND length(name) <= 100)
);

-- Usage tracking table
CREATE TABLE user_usage (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Current period (resets monthly)
  period_start DATE DEFAULT CURRENT_DATE,
  rows_processed_this_month INT DEFAULT 0,
  batches_created_this_month INT DEFAULT 0,
  api_calls_this_month INT DEFAULT 0,
  
  -- All-time totals
  total_rows_processed INT DEFAULT 0,
  total_batches INT DEFAULT 0,
  total_api_calls INT DEFAULT 0,
  
  -- Plan info
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'starter', 'pro', 'enterprise')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON user_api_keys(key_hash);
CREATE INDEX idx_user_usage_plan ON user_usage(plan_type);

-- Triggers for usage tracking
CREATE OR REPLACE FUNCTION increment_usage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_usage (user_id, rows_processed_this_month, batches_created_this_month, total_rows_processed, total_batches)
  VALUES (NEW.user_id, NEW.total_rows, 1, NEW.total_rows, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    rows_processed_this_month = user_usage.rows_processed_this_month + NEW.total_rows,
    batches_created_this_month = user_usage.batches_created_this_month + 1,
    total_rows_processed = user_usage.total_rows_processed + NEW.total_rows,
    total_batches = user_usage.total_batches + 1,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_batch_usage
AFTER INSERT ON batches
FOR EACH ROW EXECUTE FUNCTION increment_usage();
```

**Testing:**
```bash
# Run migration
psql $DATABASE_URL < supabase/migrations/003_api_keys_and_usage.sql

# Verify tables exist
psql $DATABASE_URL -c "\dt user_*"
```

#### 1.2 API Key Generation Service (1 hour)
**Files to create:**
- `lib/api-keys.ts` (200 lines)

**Implementation:**
```typescript
import { createHash, randomBytes } from 'crypto'
import { supabaseAdmin } from './supabase'

export interface ApiKey {
  id: string
  name: string
  key: string // Only returned on creation
  prefix: string
  createdAt: string
}

export async function generateApiKey(userId: string, name: string): Promise<ApiKey> {
  // Generate key: bgpt_<random_32_chars>
  const randomPart = randomBytes(24).toString('base64url')
  const key = `bgpt_${randomPart}`
  const prefix = key.slice(0, 12) // bgpt_<first8>
  const hash = createHash('sha256').update(key).digest('hex')

  const { data, error } = await supabaseAdmin
    .from('user_api_keys')
    .insert({
      user_id: userId,
      name,
      key_hash: hash,
      key_prefix: prefix
    })
    .select()
    .single()

  if (error) throw error

  return {
    id: data.id,
    name: data.name,
    key, // Only time we return the actual key!
    prefix,
    createdAt: data.created_at
  }
}

export async function verifyApiKey(key: string): Promise<string | null> {
  const hash = createHash('sha256').update(key).digest('hex')

  const { data, error } = await supabaseAdmin
    .from('user_api_keys')
    .select('user_id, revoked_at')
    .eq('key_hash', hash)
    .is('revoked_at', null)
    .single()

  if (error || !data) return null

  // Update last used
  await supabaseAdmin
    .from('user_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', hash)

  return data.user_id
}

export async function listApiKeys(userId: string) {
  const { data } = await supabaseAdmin
    .from('user_api_keys')
    .select('id, name, key_prefix, created_at, last_used_at, revoked_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return data || []
}

export async function revokeApiKey(userId: string, keyId: string) {
  const { error } = await supabaseAdmin
    .from('user_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('user_id', userId)

  if (error) throw error
}
```

**Testing:**
```typescript
// __tests__/lib/api-keys.test.ts
describe('API Keys', () => {
  it('should generate valid API key', async () => {
    const key = await generateApiKey('user-123', 'Test Key')
    expect(key.key).toMatch(/^bgpt_[A-Za-z0-9_-]{32}$/)
  })

  it('should verify valid key', async () => {
    const { key } = await generateApiKey('user-123', 'Test')
    const userId = await verifyApiKey(key)
    expect(userId).toBe('user-123')
  })

  it('should reject revoked key', async () => {
    const { key, id } = await generateApiKey('user-123', 'Test')
    await revokeApiKey('user-123', id)
    const userId = await verifyApiKey(key)
    expect(userId).toBeNull()
  })
})
```

#### 1.3 API Key Management UI (1.5 hours)
**Files to create:**
- `app/api/keys/route.ts` (GET, POST, DELETE endpoints)
- `components/api-keys/ApiKeyList.tsx`
- `components/api-keys/CreateApiKeyDialog.tsx`
- `app/(authenticated)/settings/page.tsx` (or add section to existing)

**UI Flow:**
1. Settings page → API Keys tab
2. List existing keys (prefix only, last used)
3. "Create New Key" button → Dialog
4. Show key ONCE with copy button
5. Revoke button per key

#### 1.4 Update Auth Middleware (1 hour)
**Files to modify:**
- `app/api/process/route.ts`
- `app/api/batch/[batchId]/stream/route.ts`
- `middleware/auth.ts` (create if needed)

**Implementation:**
```typescript
// middleware/auth.ts
import { verifyApiKey } from '@/lib/api-keys'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function authenticateRequest(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization')

  if (authHeader?.startsWith('Bearer bgpt_')) {
    // API key auth
    const key = authHeader.slice(7)
    return await verifyApiKey(key)
  } else if (authHeader?.startsWith('Bearer ')) {
    // Session token auth
    const token = authHeader.slice(7)
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.getUser(token)
    return error || !data.user ? null : data.user.id
  } else {
    // Cookie-based auth
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.getUser()
    return error || !data.user ? null : data.user.id
  }
}
```

**Update /api/process:**
```typescript
// Replace existing auth logic with:
const userId = await authenticateRequest(request)
if (!userId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Testing:**
```bash
# Test API key auth
API_KEY=$(curl http://localhost:3000/api/keys -X POST -d '{"name":"test"}' | jq -r '.key')

curl -X POST http://localhost:3000/api/process \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"csvFilename":"test.csv","rows":[{"name":"John"}],"prompt":"Say hello"}'
```

---

### **PHASE 2: Stripe Billing Integration** (4 hours)
*Priority: HIGH - Critical for revenue*

#### 2.1 Stripe Setup (30 min)
**Environment variables:**
```bash
# .env.local
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Install Stripe:**
```bash
npm install stripe @stripe/stripe-js
```

#### 2.2 Stripe Service Layer (1 hour)
**Files to create:**
- `lib/stripe.ts` (Stripe client + helpers)
- `lib/plans.ts` (Plan definitions)

**Implementation:**
```typescript
// lib/plans.ts
export const PLANS = {
  free: {
    name: 'Free',
    rows: 1000,
    batchesPerDay: 5,
    price: 0,
    priceId: null
  },
  starter: {
    name: 'Starter',
    rows: 10000,
    batchesPerDay: 50,
    price: 2900, // $29.00
    priceId: 'price_starter_monthly'
  },
  pro: {
    name: 'Pro',
    rows: 100000,
    batchesPerDay: 500,
    price: 9900, // $99.00
    priceId: 'price_pro_monthly'
  }
} as const

// lib/stripe.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-10-28.acacia'
})

export async function createCheckoutSession(userId: string, planType: keyof typeof PLANS) {
  const plan = PLANS[planType]
  
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: plan.priceId!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/billing`,
    metadata: { userId, planType }
  })

  return session
}
```

#### 2.3 Billing API Routes (1 hour)
**Files to create:**
- `app/api/billing/create-checkout/route.ts`
- `app/api/billing/webhook/route.ts`
- `app/api/billing/portal/route.ts`

**Webhook handler:**
```typescript
// app/api/billing/webhook/route.ts
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { headers } from 'next/headers'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = headers().get('stripe-signature')!

  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  )

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { userId, planType } = session.metadata!

    await supabaseAdmin
      .from('user_usage')
      .upsert({
        user_id: userId,
        plan_type: planType,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription
      })
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    await supabaseAdmin
      .from('user_usage')
      .update({ plan_type: 'free', stripe_subscription_id: null })
      .eq('stripe_subscription_id', subscription.id)
  }

  return Response.json({ received: true })
}
```

#### 2.4 Billing UI (1.5 hours)
**Files to create:**
- `app/(authenticated)/billing/page.tsx`
- `components/billing/PlanCard.tsx`
- `components/billing/UsageDisplay.tsx`

**UI Components:**
- Current plan display
- Usage stats (rows this month, batches, etc.)
- Plan comparison cards
- Upgrade/downgrade buttons
- Customer portal link

---

### **PHASE 3: Google Sheets Integration** (2 hours)
*Priority: MEDIUM - Requested feature*

#### 3.1 Google OAuth Setup (15 min)
**Supabase Dashboard:**
1. Auth → Providers → Enable Google
2. Add OAuth credentials from Google Cloud Console
3. Add authorized redirect: `https://ayjpnfzbxhcwwxvobssn.supabase.co/auth/v1/callback`

#### 3.2 Google Sheets API Integration (45 min)
**Files to create:**
- `lib/googleSheetsApi.ts` (copy from leadrich)
- `lib/adapters/sheetsAdapter.ts` (converter)

**Copy leadrich implementation:**
```bash
cp /tmp/leadrich/src/lib/googleSheetsApi.ts lib/
cp /tmp/leadrich/src/components/GoogleSheetsSelector.tsx components/upload/
cp /tmp/leadrich/src/components/WorksheetSelector.tsx components/upload/
```

**Create adapter:**
```typescript
// lib/adapters/sheetsAdapter.ts
import { GoogleSheetsApi } from '../googleSheetsApi'
import type { ParsedCSV } from '../types'

export async function convertSheetToCSV(
  sheetId: string,
  worksheetName: string,
  accessToken: string
): Promise<ParsedCSV> {
  const api = new GoogleSheetsApi(accessToken)
  const data = await api.getSheetData(sheetId, `${worksheetName}!A1:Z10000`)
  
  const rows = data.values || []
  const headers = rows[0] || []
  const dataRows = rows.slice(1)

  return {
    filename: worksheetName,
    headers,
    rows: dataRows.map((row, index) => ({
      index,
      data: Object.fromEntries(
        headers.map((header, i) => [header, row[i] || ''])
      )
    })),
    totalRows: dataRows.length
  }
}
```

#### 3.3 UI Integration (1 hour)
**Files to modify:**
- `components/upload/csv-upload.tsx` (add Sheets button)
- `components/bulk/BulkProcessor.tsx` (accept Sheets source)

**Add to upload UI:**
```tsx
<div className="flex gap-2">
  <button onClick={() => setShowSheetsSelector(true)}>
    Import from Google Sheets
  </button>
  
  <GoogleSheetsSelector
    open={showSheetsSelector}
    onOpenChange={setShowSheetsSelector}
    onSheetSelect={handleSheetSelect}
    accessToken={session.provider_token}
  />
</div>
```

---

### **PHASE 4: n8n Custom Node** (2 hours)
*Priority: MEDIUM - Power user feature*

#### 4.1 Create npm Package (1 hour)
**Initialize package:**
```bash
mkdir n8n-nodes-bulk-gpt
cd n8n-nodes-bulk-gpt
npm init -y
npm install n8n-workflow
```

**Files to create:**
- `credentials/BulkGptApi.credentials.ts` (20 lines)
- `nodes/BulkGpt/BulkGpt.node.ts` (150 lines)
- `nodes/BulkGpt/BulkGpt.node.json` (metadata)
- `nodes/BulkGpt/bulkgpt.svg` (icon)
- `package.json` (n8n configuration)
- `README.md` (usage docs)

**Copy implementation from roadmap doc:**
```bash
# Use the full n8n node implementation from /tmp/implementation-plan-n8n.md
```

#### 4.2 Testing & Publishing (1 hour)
**Local testing:**
```bash
# Link locally for testing
cd n8n-nodes-bulk-gpt
npm run build
npm link

# In n8n custom nodes directory
npm link n8n-nodes-bulk-gpt
```

**Publish to npm:**
```bash
npm login
npm publish
```

**Documentation:**
- Installation instructions
- API key setup
- Example workflows
- Troubleshooting

---

## 📋 TASK TRACKING

### Phase 1: API Keys & Usage (4h)
- [ ] 1.1.1 Create database migration file
- [ ] 1.1.2 Run migration on dev database
- [ ] 1.1.3 Verify schema with tests
- [ ] 1.2.1 Implement API key generation
- [ ] 1.2.2 Implement API key verification
- [ ] 1.2.3 Implement key listing/revocation
- [ ] 1.2.4 Write unit tests
- [ ] 1.3.1 Create API endpoints
- [ ] 1.3.2 Build UI components
- [ ] 1.3.3 Integrate with settings page
- [ ] 1.4.1 Create auth middleware
- [ ] 1.4.2 Update /api/process
- [ ] 1.4.3 Update /api/batch endpoints
- [ ] 1.4.4 Test with curl

### Phase 2: Stripe Billing (4h)
- [ ] 2.1.1 Install Stripe SDK
- [ ] 2.1.2 Set up Stripe test account
- [ ] 2.1.3 Create products & prices
- [ ] 2.1.4 Configure webhook endpoint
- [ ] 2.2.1 Implement Stripe service
- [ ] 2.2.2 Define plan structure
- [ ] 2.2.3 Create checkout flow
- [ ] 2.3.1 Build checkout endpoint
- [ ] 2.3.2 Build webhook handler
- [ ] 2.3.3 Build portal endpoint
- [ ] 2.3.4 Test webhook delivery
- [ ] 2.4.1 Create billing page
- [ ] 2.4.2 Build plan cards
- [ ] 2.4.3 Build usage display
- [ ] 2.4.4 Test upgrade flow

### Phase 3: Google Sheets (2h)
- [ ] 3.1.1 Enable Google OAuth in Supabase
- [ ] 3.1.2 Configure OAuth credentials
- [ ] 3.1.3 Test OAuth flow
- [ ] 3.2.1 Copy GoogleSheetsApi
- [ ] 3.2.2 Copy UI components
- [ ] 3.2.3 Create sheets adapter
- [ ] 3.2.4 Test data conversion
- [ ] 3.3.1 Add Sheets button to upload UI
- [ ] 3.3.2 Wire up sheet selection
- [ ] 3.3.3 Test end-to-end flow

### Phase 4: n8n Node (2h)
- [ ] 4.1.1 Initialize npm package
- [ ] 4.1.2 Create credentials file
- [ ] 4.1.3 Create node implementation
- [ ] 4.1.4 Add node metadata
- [ ] 4.1.5 Create icon
- [ ] 4.1.6 Write README
- [ ] 4.2.1 Test locally with n8n
- [ ] 4.2.2 Create example workflows
- [ ] 4.2.3 Publish to npm
- [ ] 4.2.4 Update docs

---

## 🧪 TESTING CHECKLIST

### API Keys
- [ ] Generate key returns valid format
- [ ] Verify key authenticates correctly
- [ ] Revoked key returns 401
- [ ] List keys shows all user's keys
- [ ] Key updates last_used_at

### Usage Tracking
- [ ] Batch insert increments usage
- [ ] Monthly stats reset correctly
- [ ] Plan limits enforced
- [ ] Usage displayed in UI

### Stripe
- [ ] Checkout session creates successfully
- [ ] Webhook updates user plan
- [ ] Subscription cancellation works
- [ ] Customer portal accessible

### Google Sheets
- [ ] OAuth flow completes
- [ ] Sheets list loads
- [ ] Data converts correctly
- [ ] Processing works same as CSV

### n8n Node
- [ ] Node appears in n8n
- [ ] Credentials save correctly
- [ ] Batch processing works
- [ ] Results return properly

---

## 📈 SUCCESS METRICS

### Phase 1 Success:
- Users can generate API keys
- curl requests work with API keys
- Usage tracked in database

### Phase 2 Success:
- Users can subscribe to paid plans
- Stripe webhooks update database
- Usage limits enforced per plan

### Phase 3 Success:
- Users can authenticate with Google
- Sheets data imports successfully
- Processing works identically to CSV

### Phase 4 Success:
- n8n node installs from npm
- Workflows can process batches
- Results stream back to n8n

---

## 🚨 RISKS & MITIGATIONS

### Risk: Stripe webhook failures
**Mitigation:** 
- Test webhooks thoroughly in test mode
- Add retry logic
- Log all webhook events
- Manual reconciliation tool

### Risk: Google OAuth issues
**Mitigation:**
- Test with multiple Google accounts
- Handle token expiration gracefully
- Provide clear error messages
- Fallback to CSV upload

### Risk: n8n compatibility
**Mitigation:**
- Test with latest n8n version
- Version constraints in package.json
- Clear upgrade path documentation

### Risk: Usage tracking drift
**Mitigation:**
- Hourly reconciliation job
- Manual audit tools
- Alert on anomalies

---

## 🔄 ROLLOUT PLAN

### Week 1: Foundation
- Days 1-2: Phase 1 (API Keys)
- Days 3-4: Phase 2 (Stripe)
- Day 5: Testing & bug fixes

### Week 2: Integrations
- Days 1-2: Phase 3 (Google Sheets)
- Days 3-4: Phase 4 (n8n)
- Day 5: Documentation & launch prep

### Launch:
1. Deploy to staging
2. Smoke test all features
3. Deploy to production
4. Monitor for 24h
5. Announce to users

---

## 📚 DOCUMENTATION NEEDS

- [ ] API Keys guide (how to generate, use, rotate)
- [ ] curl examples for all endpoints
- [ ] n8n workflow templates
- [ ] Google Sheets setup guide
- [ ] Billing FAQ
- [ ] Rate limits documentation
- [ ] Migration guide (free → paid)

---

## 🎯 NEXT STEPS

1. Review this roadmap
2. Confirm priorities
3. Set start date
4. Begin Phase 1
5. Track progress with TodoWrite

**Ready to begin?** ✅

