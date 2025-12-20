-- Enable REPLICA IDENTITY FULL for realtime updates
ALTER TABLE public.reference_values REPLICA IDENTITY FULL;

-- Add the table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.reference_values;