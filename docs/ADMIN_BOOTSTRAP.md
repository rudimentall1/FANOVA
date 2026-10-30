# Initial administrator bootstrap

FANOVA does not expose a public endpoint for granting administrator or creator roles. A newly registered account receives only the `reader` role. Creator access is granted only by an administrator after reviewing a creator application.

For a fresh environment, a trusted operator must provision the first administrator through a direct, authenticated database session. Do this only after the administrator has registered and verified their email.

Run the following in `psql`, replacing the address with the verified operator account:

```sql
INSERT INTO user_role (id, user_id, role, assigned_by)
SELECT
  'bootstrap-admin-' || id,
  id,
  'admin',
  id
FROM "user"
WHERE email = 'operator@example.com'
  AND "emailVerified" = true
ON CONFLICT (user_id, role) DO NOTHING
RETURNING user_id;
```

Verify that exactly the intended account has the administrator role:

```sql
SELECT u.email, r.role, r.assigned_at, r.assigned_by
FROM user_role r
JOIN "user" u ON u.id = r.user_id
WHERE r.role = 'admin';
```

If the insert returns no row, confirm the account exists and has a verified email. Do not work around this check by assigning the role through the public API.

The initial administrator can review creator applications at `/admin/creator-requests`. Approvals create a `creator` role row with `assigned_by` set to the reviewing administrator. Every decision is one-way for that request; a reviewed request cannot be changed by submitting the same decision endpoint again.

This bootstrap is an operational step, not a self-service feature. Keep database credentials and direct database access restricted to trusted operators.
