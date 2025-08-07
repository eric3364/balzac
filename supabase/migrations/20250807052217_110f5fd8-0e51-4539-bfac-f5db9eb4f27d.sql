-- Create a public bucket for badge uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('public', 'public', true);

-- Create policies for badge uploads in the public bucket
CREATE POLICY "Anyone can view badges" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'public' AND (storage.foldername(name))[1] = 'badges');

CREATE POLICY "Authenticated users can upload badges" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'public' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = 'badges');

CREATE POLICY "Users can delete their own badges" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'public' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = 'badges');