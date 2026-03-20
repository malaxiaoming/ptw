-- Expand permit_activity_log action constraint to include PDF events
ALTER TABLE permit_activity_log DROP CONSTRAINT IF EXISTS permit_activity_log_action_check;
ALTER TABLE permit_activity_log ADD CONSTRAINT permit_activity_log_action_check
  CHECK (action IN ('created', 'submitted', 'returned', 'verified', 'approved',
    'rejected', 'revoked', 'closure_submitted', 'closure_returned', 'closed',
    'pdf_generated', 'pdf_failed'));
