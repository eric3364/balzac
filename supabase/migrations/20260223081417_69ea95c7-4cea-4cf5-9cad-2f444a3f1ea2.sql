
-- Table pour stocker les emails reçus
CREATE TABLE public.received_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email text NOT NULL,
  from_name text,
  to_email text NOT NULL DEFAULT 'contact@balzac.education',
  subject text NOT NULL DEFAULT '(sans objet)',
  body_text text,
  body_html text,
  received_at timestamp with time zone NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'en_cours', 'traité')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table pour stocker les réponses envoyées
CREATE TABLE public.email_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_email_id uuid NOT NULL REFERENCES public.received_emails(id) ON DELETE CASCADE,
  replied_by uuid NOT NULL,
  reply_text text NOT NULL,
  reply_html text,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_received_emails_received_at ON public.received_emails(received_at DESC);
CREATE INDEX idx_received_emails_status ON public.received_emails(status);
CREATE INDEX idx_email_replies_email_id ON public.email_replies(received_email_id);

-- RLS
ALTER TABLE public.received_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_replies ENABLE ROW LEVEL SECURITY;

-- Admins can view all received emails
CREATE POLICY "Admins can view received emails"
ON public.received_emails FOR SELECT
USING (EXISTS (SELECT 1 FROM administrators WHERE user_id = auth.uid()));

-- Admins can update received emails (mark as read, change status)
CREATE POLICY "Admins can update received emails"
ON public.received_emails FOR UPDATE
USING (EXISTS (SELECT 1 FROM administrators WHERE user_id = auth.uid()));

-- Service role can insert emails (from webhook)
CREATE POLICY "Service role can insert emails"
ON public.received_emails FOR INSERT
WITH CHECK (true);

-- Admins can view email replies
CREATE POLICY "Admins can view email replies"
ON public.email_replies FOR SELECT
USING (EXISTS (SELECT 1 FROM administrators WHERE user_id = auth.uid()));

-- Admins can insert email replies
CREATE POLICY "Admins can insert email replies"
ON public.email_replies FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM administrators WHERE user_id = auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_received_emails_updated_at
BEFORE UPDATE ON public.received_emails
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
