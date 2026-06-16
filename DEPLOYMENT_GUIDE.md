# SUPABASE SECURITY HARDENING - PHASE 2: DEPLOYMENT GUIDE

**Date**: 2026-03-25  
**Status**: Ready for Production  
**Risk Level**: LOW (Service role unaffected, backward compatible)

---

## 🎯 What's Being Deployed

### 3 New Migrations
1. **20260325_enable_rls_all_tables.sql** (Phase 1 - Basic RLS)
   - Enables RLS on 60+ tables
   - Creates simple authenticated access policies
   - Blocks sensitive token access completely

2. **20260325_advanced_rls_audit.sql** (Phase 2 - NEW)
   - Granular role-based policies
   - Audit logging for sensitive data
   - JWT custom claims preparation

3. **20260325_test_validation.sql** (Phase 2 - Testing only)
   - Validation queries to verify everything works
   - Compatibility checks
   - Performance monitoring

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### 1. Backup Your Database
```bash
# Via Supabase dashboard:
# Project Settings → Database → Backups → Create Backup

# Or via CLI:
supabase db pull  # Downloads current schema
```

### 2. Verify Current State
```sql
-- Run in Supabase SQL Editor:

-- Should show profiles table exists with 'role' column:
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'role';
-- Expected: (role | text)

-- Should show coach/parent/bureau users exist:
SELECT DISTINCT role FROM public.profiles WHERE role IS NOT NULL;
-- Expected: 'coach', 'parent', 'bureau' (or subset)
```

### 3. Test Service Role Access (Critical)
```sql
-- This MUST work with service role after deployment

-- Run as service role only:
SELECT COUNT(*) FROM public.communication_access_tokens;
SELECT COUNT(*) FROM public.budget_lignes;
SELECT COUNT(*) FROM public.equipes;

-- All should return ✅ Without errors
```

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Deploy Phase 1 (if not already done)
```bash
# In Supabase SQL Editor, copy and run:
# db/migrations/20260325_enable_rls_all_tables.sql

# Or via CLI:
supabase migration list  # Check if applied
supabase db push         # Apply pending migrations
```

**Verification**: 
```sql
-- Check table count with RLS enabled
SELECT COUNT(*) FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
-- Expected: 60+
```

### Step 2: Deploy Phase 2 (Granular Policies)
```bash
# In Supabase SQL Editor, copy and run:
# db/migrations/20260325_advanced_rls_audit.sql
```

**⚠️ CRITICAL**: Deployment happens in a transaction (BEGIN...COMMIT)
- If ANY query fails, ENTIRE deployment rolls back automatically ✅
- You'll see error message showing which line failed
- Database remains in pre-deployment state (safe!)

**Verification** (wait 5 seconds, then):
```sql
-- Check that audit table was created:
SELECT COUNT(*) FROM public.audit_sensitive_access;
-- Expected: 0 (table exists but empty)

-- Check functions exist:
SELECT COUNT(*) FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name LIKE 'fn_%';
-- Expected: 7+ functions
```

### Step 3: Run Validation Tests
```bash
# In Supabase SQL Editor, copy and run:
# db/migrations/20260325_test_validation.sql

# Run tests 1-10 one by one, verify expected results
```

---

## ⚙️ SERVICE ROLE COMPATIBILITY VERIFICATION

### ✅ ALL API Routes Continue Working
```typescript
// Your API routes work UNCHANGED - still use supabaseAdmin()
const db = supabaseAdmin();
const data = await db.from('equipes').select(); // ✅ Works

// Service role automatically bypasses ALL RLS policies
```

### ✅ Test Your Actual API Routes
```bash
# After deployment, test one of your routes:
curl https://yourapp.com/api/get-full-registration
# Should return same data as before

# Check server logs:
npm run dev  # In development
# No new errors related to RLS
```

### ✅ No Changes to Client Code
- Your browser client code stays the same
- If it was broken before (hitting sensitive tables), it's still blocked (intentional!)
- Only server-to-server calls work (that's the point)

---

## 📊 MONITORING DEPLOYMENT

### Real-time Deployment Check
1. Go to Supabase Dashboard → Project → SQL Editor
2. Run deployment SQL
3. Look for: "Query successful" at the bottom (green ✓)

### After Deployment - First Check
```sql
-- In Supabase SQL editor:

-- 1. Functions working?
SELECT public.fn_get_user_role();
-- Expected: 'public' (since you're not authenticated) or actual role

-- 2. Audit table working?
INSERT INTO public.audit_sensitive_access (
  table_name, action, accessed_at
) VALUES ('test', 'INSERT', now());
-- Expected: No error

-- 3. Policies applied?
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
-- Expected: Much higher than before (50+)
```

---

## 🎬 POST-DEPLOYMENT: ENABLE JWT CUSTOM CLAIMS

This is **optional but recommended** for full granular control.

### Configure Custom JWT Claims (Supabase Dashboard)

1. **Go to**: Project Settings → Authentication → JWT Defaults
2. **Find**: "Add custom claim"
3. **Enter**:
   ```json
   {
     "app_metadata": {
       "role": "SELECT role FROM profiles WHERE id = auth.users.id LIMIT 1"
     }
   }
   ```
   OR use Supabase Auth Rules (if available in your version)

4. **Then Policies Can Use**:
   ```sql
   auth.jwt()->'app_metadata'->>'role' = 'coach'
   ```

⚠️ **Note**: Our migration works WITHOUT this (uses `fn_get_user_role()`). Custom claims are an optimization for performance.

---

## 🔄 WHAT CHANGED FOR DIFFERENT USERS

### ✅ API Routes (Server-Side)
```
BEFORE: Works ✅
AFTER:  Works ✅ (Unchanged - service role bypasses RLS)
```

### ✅ Browser Clients (Authenticated Users)
```
BEFORE: Unrestricted (security risk!)
AFTER:  

- Coaches: Can see only their teams
- Parents: Can see only their children  
- Bureau: Can see everything (with audit trail)
- Sensitive tokens: BLOCKED (intentional)

This is SAFER, not broken!
```

### ✅ Token/API Consumers
```
BEFORE: Accessible (security risk!)
AFTER:  BLOCKED at database level ✅

These MUST be accessed via API routes with service role
No changes needed to your routes (they use service role)
```

---

## ⚠️ TROUBLESHOOTING

### Symptom: Deployment Fails with Syntax Error
**Cause**: Migration SQL has a typo  
**Fix**:
```sql
-- Check the error message for line number
-- Look at that line in the SQL file
-- Verify table names and syntax

-- Then try again (transaction will auto-rollback)
```

### Symptom: API Routes Return "PERMISSION DENIED"
**Cause**: Route not using `supabaseAdmin()`  
**Fix**:
```typescript
// ❌ WRONG (uses anon key)
const { data } = await supabase.from('budget_lignes').select();

// ✅ RIGHT (uses service role)
const { data } = await supabaseAdmin().from('budget_lignes').select();
```

### Symptom: Functions Return NULL or Unexpected Values
**Cause**: `profiles` table doesn't have user's role  
**Fix**:
```sql
-- Check if user exists in profiles:
SELECT id, role FROM public.profiles 
WHERE id = 'the-user-uuid';

-- If not found, insert:
INSERT INTO public.profiles (id, role)
VALUES ('the-user-uuid', 'coach');

-- Or update:
UPDATE public.profiles SET role = 'coach' 
WHERE id = 'the-user-uuid';
```

### Symptom: Audit Logging Is Empty
**Cause**: Triggers not firing or queries use service role  
**Note**: This is normal! Service role bypasses RLS and triggers
**Expected**: Audit logs when clients (anon key) query sensitive tables

---

## 🔐 SECURITY VERIFICATION

### Test 1: Sensitive Data Blocked from Client
```sql
-- As ANON user (not authenticated):
SELECT * FROM public.communication_access_tokens;
-- Expected: ❌ Permission denied (0 rows)

-- As SERVICE ROLE:
SELECT * FROM public.communication_access_tokens;
-- Expected: ✅ Works (shows data)
```

### Test 2: Granular Role Access
```sql
-- Simulate as COACH user:
SET ROLE coach_user;
SELECT * FROM public.equipes;
-- Expected: Only this coach's teams

-- Simulate as PARENT user:
SET ROLE parent_user;
SELECT * FROM public.athletes;
-- Expected: Only this parent's athletes
```

### Test 3: Audit Logging
```sql
-- Check audit log (as BUREAU):
SELECT COUNT(*) as access_count 
FROM public.audit_sensitive_access
WHERE table_name = 'communication_access_tokens';

-- Should increment when sensitive tables are accessed
```

---

## 📈 PERFORMANCE IMPACT

### Expected Impact
- **Minimal** (~5-10% slower on select queries with large joins)
- Service role queries: **No impact** (bypasses RLS)
- New functions use SECURITY DEFINER for efficiency

### Optimization Tips
```sql
-- If performance degrades, add indexes:
CREATE INDEX idx_coachs_equipes_coach_id 
ON public.coachs_equipes(coach_id WHERE coach_id IS NOT NULL);

CREATE INDEX idx_athletes_email_parent 
ON public.athletes(email_parent);

-- Monitor query performance:
EXPLAIN ANALYZE 
SELECT * FROM public.equipes 
WHERE public.fn_is_coach() = true;
```

---

## 🔄 ROLLBACK PROCEDURE

### If Something Breaks Immediately

**Option 1: Quick Rollback** (Revert entire Phase 2)
```sql
-- In Supabase SQL Editor:

BEGIN;

-- Drop new triggers
DROP TRIGGER IF EXISTS trg_audit_com_recipients ON public.com_recipients;
DROP TRIGGER IF EXISTS trg_audit_communication_access_tokens ON public.communication_access_tokens;
DROP TRIGGER IF EXISTS trg_audit_reinscription_propositions ON public.reinscription_propositions;
DROP TRIGGER IF EXISTS trg_audit_photo_thumbs2 ON public.photo_thumbs2;

-- Drop new functions
DROP FUNCTION IF EXISTS public.fn_audit_sensitive_access();
DROP FUNCTION IF EXISTS public.fn_get_user_role();
DROP FUNCTION IF EXISTS public.fn_is_coach();
DROP FUNCTION IF EXISTS public.fn_is_parent();
DROP FUNCTION IF EXISTS public.fn_is_bureau();
DROP FUNCTION IF EXISTS public.fn_coach_assigned_to_equipe(BIGINT);
DROP FUNCTION IF EXISTS public.fn_parent_can_view_athlete(BIGINT);

-- Drop audit table
DROP TABLE IF EXISTS public.audit_sensitive_access;

-- Drop new policies (keep old simple ones)
DROP POLICY IF EXISTS "equipes_coach_own_team" ON public.equipes;
DROP POLICY IF EXISTS "equipes_select_authenticated" ON public.equipes;
-- ... (drop all new policies)

COMMIT;
```

**Option 2: Restore from Backup** (Supabase Dashboard)
- Go to: Project Settings → Database → Backups
- Click "Restore" on pre-deployment backup
- Takes 5-15 minutes

---

## ✨ SUCCESS CRITERIA

After deployment, verify these all pass:

- [ ] All API routes working (test one)
- [ ] Service role still has full access
- [ ] Audit table exists and has 0 rows initially
- [ ] Functions all exist: `SELECT COUNT(*) FROM information_schema.routines...`
- [ ] Policies exist on key tables: `SELECT COUNT(*) FROM pg_policies...`
- [ ] No errors in server logs
- [ ] Client auth users see role-based results (coaches see their teams)
- [ ] Sensitive tables blocked from unauthenticated clients

---

## 📞 SUPPORT

For issues:
1. Check troubleshooting section above
2. Run validation SQL from `20260325_test_validation.sql`
3. Check Supabase documentation: https://supabase.com/docs/guides/database/postgres/row-level-security
4. Look at error message in SQL Editor (most specific info)

---

## 📋 DEPLOYMENT CHECKLIST

```
PRE-DEPLOYMENT:
  ☐ Backup database
  ☐ Verify current RLS state
  ☐ Test service role access
  ☐ Review this guide

DEPLOYMENT:
  ☐ Copy Phase 1 SQL if not done
  ☐ Copy Phase 2 SQL and run (watch for ✓ green success)
  ☐ Wait 10 seconds
  ☐ Run validation tests

POST-DEPLOYMENT:
  ☐ Test one API route
  ☐ Verify audit table exists
  ☐ Check functions exist
  ☐ Monitor first 24 hours for errors
  ☐ (Optional) Configure JWT custom claims

DOCUMENTATION:
  ☐ Update team on new granular policies
  ☐ Explain to coaches/parents what they can see
  ☐ Set up monitoring for audit logs
```

---

**🎉 Deployment Complete!**  
Your Supabase database is now hardened with granular role-based access and audit logging.
