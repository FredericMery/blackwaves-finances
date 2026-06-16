# SUPABASE SECURITY - PHASE 2: FINAL VERIFICATION CHECKLIST

**Date**: 2026-03-25  
**Status**: Ready for Deployment  
**Risk Assessment**: ✅ LOW (Additive changes only, service role untouched)

---

## 📋 PRE-DEPLOYMENT VERIFICATION

### Step 1: Backup Your Database
- [ ] Go to Supabase Dashboard → Project Settings → Database → Backups
- [ ] Click "Create Backup"
- [ ] Wait for backup to complete (usually <2 minutes)
- [ ] Record backup ID in case rollback needed

### Step 2: Verify Service Role Access (CRITICAL)
Run this in Supabase SQL Editor with **SERVICE ROLE** key:

```sql
-- These MUST work before deployment
SELECT COUNT(*) as equipes_count FROM public.equipes;
SELECT COUNT(*) as tokens_count FROM public.communication_access_tokens;
SELECT COUNT(*) as budgets FROM public.budget_lignes;

-- Expected: 3 rows with numbers (no permission errors)
```

✅ If all return numbers: **SAFE TO PROCEED**  
❌ If any show permission errors: **DO NOT PROCEED** (contact support)

### Step 3: Check That profiles Table Exists
```sql
-- With SERVICE ROLE:
SELECT COUNT(*) FROM public.profiles;
-- Expected: Number ≥ 0 (row exists or not, doesn't matter)

-- Check it has 'role' column:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'role';
-- Expected: Returns 'role'
```

✅ If both work: **SAFE TO PROCEED**

---

## 🚀 DEPLOYMENT STEPS

### MIGRATION 1: Phase 1 (If Not Already Done)
If you haven't already deployed basic RLS:
```
File: db/migrations/20260325_enable_rls_all_tables.sql
```

Run in Supabase SQL Editor with SERVICE ROLE:
1. Copy entire file content
2. Paste into SQL Editor
3. Click "Execute"
4. Wait for `COMMIT;` message (green ✓)

**Verify Success**:
```sql
SELECT COUNT(*) FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
-- Expected: 60+
```

### MIGRATION 2: Phase 2 (NEW - Audit & Helper Functions)
```
File: db/migrations/20260325_advanced_rls_audit.sql
```

Run in Supabase SQL Editor with SERVICE ROLE:
1. Copy entire file content
2. Paste into SQL Editor
3. Click "Execute"
4. **Wait 10 seconds** (deployment happening)
5. Look for: Green checkmark ✓ and "Query successful"

**Verify Success** (wait 5 seconds, then):
```sql
-- Check audit table exists:
SELECT COUNT(*) FROM public.audit_sensitive_access;
-- Expected: 0 (empty table exists)

-- Check functions created:
SELECT COUNT(*) FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name LIKE 'fn_%';
-- Expected: 4+ functions
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

### Test 1: Verify Functions Work
```sql
-- With any user (can be SERVICE ROLE):
SELECT public.fn_get_user_role() as current_role;
-- Expected: Returns a role (might be 'public', 'coach', 'parent', 'bureau')

SELECT public.fn_is_coach() as is_coach;
-- Expected: Returns true or false

SELECT public.fn_is_bureau() as is_bureau;
-- Expected: Returns true or false
```

### Test 2: Verify Audit Table
```sql
-- Try to insert a test audit log:
INSERT INTO public.audit_sensitive_access (
  table_name,
  action,
  accessed_at
) VALUES ('test_table', 'SELECT', now());

SELECT COUNT(*) FROM public.audit_sensitive_access;
-- Expected: 1+ rows (your test entry plus any triggered ones)
```

### Test 3: Verify API Routes Still Work
```bash
# Test one of your actual API routes:
curl https://yourapp.com/api/get-full-registration

# Expected: Same response as before deployment
# If error: Check server logs for RLS permission errors
```

### Test 4: Verify Service Role Still Works
```sql
-- With SERVICE ROLE:
SELECT COUNT(*) FROM public.communication_access_tokens;
-- Expected: Working (service role bypasses RLS)
```

---

## 🔍 VALIDATION TESTS

Run these SELECT queries to verify everything is working:

```sql
-- VALIDATION 1: Role functions exist and work
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name LIKE 'fn_%'
ORDER BY routine_name;

-- Expected results:
-- fn_audit_sensitive_access
-- fn_coach_assigned_to_equipe
-- fn_get_user_role
-- fn_is_bureau
-- fn_is_coach
-- fn_is_parent
-- fn_parent_can_view_athlete

-- VALIDATION 2: Audit table has correct structure
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'audit_sensitive_access'
ORDER BY ordinal_position;

-- Expected 8 columns:
-- id | bigint
-- user_id | uuid
-- table_name | text
-- action | text
-- row_count | integer
-- accessed_at | timestamp with time zone
-- ip_address | inet
-- note | text

-- VALIDATION 3: Audit table has RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename = 'audit_sensitive_access';
-- Expected: TRUE

-- VALIDATION 4: Audit policies exist
SELECT policyname FROM pg_policies
WHERE tablename = 'audit_sensitive_access'
ORDER BY policyname;
-- Expected:
-- audit_sensitive_access_bureau_only
-- audit_sensitive_access_insert_service

-- VALIDATION 5: Triggers created on sensitive tables
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_schema = 'public' AND action_statement LIKE '%fn_audit%'
ORDER BY trigger_name;
-- Expected 4+ triggers
```

---

## ⚠️ TROUBLESHOOTING

### Issue: "Query successful" but nothing changed
**Cause**: Migration already applied  
**Fix**: Normal - migration checks `IF NOT EXISTS`, so it's idempotent ✅

### Issue: FunctionNotFound or SyntaxError
**Cause**: Migration has SQL error  
**Fix**: 
1. Check error line number carefully
2. Verify table names exist (check in your Supabase dashboard)
3. If still stuck: Use Script `SCHEMA_CHECK.sql` to verify table structures

### Issue: API Routes Return "Permission Denied"
**Cause**: Route code changed to use anonymous key instead of service role  
**Fix**: Verify the route is using `supabaseAdmin()`:
```typescript
// ✅ Correct:
const db = supabaseAdmin();
const data = await db.from('table').select();

// ❌ Wrong (would fail):
const { data } = await supabase.from('table').select();
```

### Issue: Audit Table Empty After Queries
**Cause**: Queries used service role (which bypasses triggers)  
**Fix**: Expected behavior! Audit only logs client queries, not service role
```sql
-- Audit logs would trigger from client access, like:
-- const { data } = await supabase.from('audit_sensitive_access').select();
-- (would fail due to DENY ALL, but audit would log the attempt)
```

---

## 🆘 ROLLBACK PROCEDURE

If something breaks, you have two options:

### Option 1: Quick SQL Rollback
```sql
-- In Supabase SQL Editor:
DROP TRIGGER IF EXISTS trg_audit_com_recipients ON public.com_recipients;
DROP TRIGGER IF EXISTS trg_audit_communication_access_tokens ON public.communication_access_tokens;
DROP TRIGGER IF EXISTS trg_audit_reinscription_propositions ON public.reinscription_propositions;
DROP TRIGGER IF EXISTS trg_audit_photo_thumbs2 ON public.photo_thumbs2;

DROP FUNCTION IF EXISTS public.fn_audit_sensitive_access();
DROP FUNCTION IF EXISTS public.fn_get_user_role();
DROP FUNCTION IF EXISTS public.fn_is_coach();
DROP FUNCTION IF EXISTS public.fn_is_parent();
DROP FUNCTION IF EXISTS public.fn_is_bureau();
DROP FUNCTION IF EXISTS public.fn_coach_assigned_to_equipe(BIGINT);
DROP FUNCTION IF EXISTS public.fn_parent_can_view_athlete(BIGINT);

DROP TABLE IF EXISTS public.audit_sensitive_access;
```

### Option 2: Restore from Backup
1. Go to Supabase → Project Settings → Database → Backups
2. Find your backup from before deployment
3. Click "Restore"
4. Confirm
5. Wait 5-15 minutes
6. Database will be back to pre-deployment state

---

## 📊 WHAT CHANGED

### Added
- ✅ `audit_sensitive_access` table (tracks sensitive data access)
- ✅ 7 helper functions for role checking
- ✅ 4 audit triggers on sensitive tables
- ✅ RLS policy on audit table (bureau-only read)

### Unchanged (SAFE)
- ✅ All existing RLS policies from Phase 1
- ✅ Service role access (bypasses all RLS)
- ✅ API routes (use service role, unaffected)
- ✅ Database structure (no schema changes)

### Optional (Phase 3)
- 🔄 Granular role-based policies (coaches see only their teams, etc.)
- 🔄 JWT custom claims configuration
- 🔄 Performance optimization

---

## 📈 SUCCESS METRICS

After deployment, you should observe:

1. ✅ All validation tests pass (see above)
2. ✅ API routes work unchanged
3. ✅ Service role queries still work
4. ✅ No new errors in server logs
5. ✅ Audit table records access (when tested)
6. ✅ Functions exist and execute without error

---

## 📝 NEXT STEPS (Optional)

### Phase 3: Granular Role-Based Policies
Now that helper functions exist, you can:
1. Add more specific policies per table
2. Configure JWT custom claims for better performance
3. Monitor audit logs for security incidents

---

## 🎉 DEPLOYMENT COMPLETE!

If everything above checks out:
1. Your database is backed up ✓
2. Phase 1 RLS is enabled ✓
3. Phase 2 audit & helpers deployed ✓
4. No breaking changes ✓
5. Service role still works ✓
6. Ready for Phase 3 (if wanted) ✓

**You're secure!**
