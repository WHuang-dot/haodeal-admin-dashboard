-- Create admin_audit_logs table
-- This table records all mutation operations from the dashboard

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_id TEXT NOT NULL,
    before JSONB DEFAULT NULL,
    after JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for common queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_user_id ON public.admin_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_table ON public.admin_audit_logs(target_table);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- Add RLS policy (disable for service role key access)
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON public.admin_audit_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);
