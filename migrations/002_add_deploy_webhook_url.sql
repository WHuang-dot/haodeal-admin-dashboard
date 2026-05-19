ALTER TABLE public.app_runtime_settings
ADD COLUMN IF NOT EXISTS deploy_webhook_url text null;
