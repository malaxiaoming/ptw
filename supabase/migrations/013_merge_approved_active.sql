-- Merge "approved" status into "active"
-- Approving a permit now goes directly to active, eliminating the separate activate step.

-- Migrate existing approved permits to active
UPDATE permits
SET status = 'active',
    activated_at = COALESCE(activated_at, approved_at)
WHERE status = 'approved';

-- Update permits status CHECK constraint (remove 'approved')
ALTER TABLE permits DROP CONSTRAINT IF EXISTS permits_status_check;
ALTER TABLE permits ADD CONSTRAINT permits_status_check
  CHECK (status IN ('draft', 'submitted', 'verified', 'active',
    'closure_submitted', 'closed', 'rejected', 'revoked'));

-- Update activity log action constraint (remove 'activated', keep 'approved' for audit trail)
ALTER TABLE permit_activity_log DROP CONSTRAINT IF EXISTS permit_activity_log_action_check;
ALTER TABLE permit_activity_log ADD CONSTRAINT permit_activity_log_action_check
  CHECK (action IN ('created', 'submitted', 'returned', 'verified', 'approved',
    'rejected', 'revoked', 'closure_submitted', 'closure_returned', 'closed'));
