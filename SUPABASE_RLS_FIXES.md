# Supabase Security Fixes - Implementation Guide

## Summary
Created migration file `db/migrations/20260325_enable_rls_all_tables.sql` to fix all Supabase security alerts.

### Issues Resolved

#### 1. **RLS Disabled on 54+ Tables**
All public tables are now protected with Row Level Security enabled.

#### 2. **Sensitive Columns Exposed (6 tables)**
Tables with sensitive data (tokens, session IDs) now use restrictive DENY ALL policies:
- `com_recipients` (token column)
- `communication_access_tokens` (token column)
- `communication_recipients` (token column)
- `parent_communication_recipients` (token column)
- `photo_thumbs2` (session_id column)
- `reinscription_propositions` (token column)

#### 3. **Policy Exists But RLS Disabled**
Fixed for:
- `budget_lignes`
- `budget_lignes_supprimees`

## How It Works

### Service Role (Server-Side) - Full Access
Your API routes (`app/api/*`) use the service role key and **automatically bypass all RLS policies**. This means:
- Server code via `supabaseAdmin()` can read/write everything
- No need to modify your existing API routes
- Admin operations work as before

### Client Access - Protected
Browser/client code using anonymous key now respects RLS:
- **Sensitive tables**: Cannot access (DENY ALL policy)
- **Public definitions**: Can read (e.g., team types, age categories)
- **Other tables**: Require authentication
- Server can handle data access and return filtered results to clients

## Policy Strategy

```
SENSITIVE TOKENS/SESSIONS
├─ communication_access_tokens       → DENY ALL
├─ communication_recipients (token)  → DENY ALL
├─ parent_communication_recipients   → DENY ALL
├─ com_recipients (token)           → DENY ALL
├─ photo_thumbs2 (session_id)       → DENY ALL
└─ reinscription_propositions       → DENY ALL
   → Only accessible via server-side API routes with service role

PUBLIC DEFINITIONS
├─ def_equipe_types      → SELECT all (no auth needed)
├─ def_equipe_ages       → SELECT all (no auth needed)
├─ def_equipes_saison    → SELECT all (no auth needed)
├─ def_saison_preparation → SELECT all (no auth needed)
└─ tarifs_saison         → SELECT all (no auth needed)

AUTHENTICATED DATA
└─ All other tables      → SELECT only if auth.uid() IS NOT NULL
   → Clients need valid JWT token
   → Server can access everything via service role
```

## Deployment Steps

### 1. Apply Migration
Run this in Supabase SQL Editor or via migrations CLI:
```bash
# Via CLI (if using Supabase CLI)
supabase db push
```

Or manually in Supabase:
1. Go to Project → SQL Editor
2. Copy contents of `db/migrations/20260325_enable_rls_all_tables.sql`
3. Run it

### 2. Verify in Supabase Console
After applying:
1. Go to Authentication → Policies
2. You should see policies listed for all tables
3. Go to Database → Tables and check "RLS enabled" toggle is ON for each table

### 3. Re-run Security Audit
Back in Supabase Security tab, re-lint your database. Alerts should be resolved.

## What Needs to Change in Your Code

### ✅ No Changes Needed For:
- **All API routes** under `app/api/` - service role bypasses RLS
- **Server components** using `supabaseAdmin()` - service role bypasses RLS

### ⚠️ Consider Optimizing For:
Your client-side code will now be restricted. However, since you're already using a secure pattern (all data operations via server API routes), **nothing breaks**.

If you were directly querying sensitive tables from the client, those queries will now fail with auth errors - which is the desired security behavior.

## Best Practices Going Forward

### ✅ Recommended Pattern (Already Using)
```typescript
// ✅ GOOD: Server-side via service role
const db = supabaseAdmin();
const data = await db.from('communication_access_tokens').select();
```

### ❌ Avoid (Now Protected)
```typescript
// ❌ NO LONGER WORKS: Client trying to read sensitive tokens
const { data } = await supabase
  .from('communication_access_tokens')
  .select('token'); // Blocked by RLS
```

### ✅ To Share Data with Client
```typescript
// ✅ GOOD: Server fetches, filters, returns to client
const data = await supabaseAdmin().from('table').select();
return Response.json(data); // Your API route
```

## Next Steps for Enhanced Security

### Tier 1 (Optional but recommended): JWT Custom Claims
Add user role information to JWT claims:
```sql
-- Track user roles in database
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'parent', -- 'parent', 'coach', 'bureau'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Configure Supabase to include in JWT custom claims
-- Then update policies with:
CREATE POLICY "row_level_access" ON public.communications
  FOR SELECT USING (
    auth.jwt()->'app_metadata'->>'role' = 'bureau'
    OR auth.uid()::text = current_user_id
  );
```

### Tier 2 (Advanced): Row-Level Granular Policies
```sql
-- Example: Coaches can only see their own teams
CREATE POLICY "coach_sees_own_teams" ON public.equipes
  FOR SELECT USING (
    coach_id = auth.uid()::text
  );
```

### Tier 3: Add Audit Logging
Monitor data access in sensitive tables.

## Testing

Run these queries in Supabase SQL Editor to verify:

```sql
-- Test 1: Public can read definitions
SELECT * FROM public.def_equipe_types;

-- Test 2: Anon cannot read tokens (should return 0 rows or error)
-- Note: will fail with auth error - that's correct
SELECT * FROM public.communication_access_tokens;

-- Test 3: View all active RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

## Troubleshooting

### API Routes Return "Unauthorized"
- **Cause**: Route not using `supabaseAdmin()`
- **Fix**: Change to `supabaseAdmin()` in server-side code

### Client Can't Read Public Definitions
- **Cause**: Using anonymous key correctly
- **Fix**: Public definition policies allow unauthenticated read

### Policies Don't Exist
- **Fix**: Check migration ran completely (`COMMIT;` at end)

## Support & Documentation
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter)
- Supabase Project → Database → Policies (view all policies)
