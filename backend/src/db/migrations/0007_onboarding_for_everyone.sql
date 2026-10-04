-- Deliberately does nothing.
--
-- This migration was written (2026-10-04) to mark every existing account as
-- already onboarded, so only new sign-ups would see /welcome. That was
-- reversed before it ever shipped: accounts from before the flow go through
-- it too, on their next visit — so their onboarded_at stays NULL, which is
-- what 0006 left it as. Kept as a no-op so the numbering of 0008 onward does
-- not move.
SELECT 1;
