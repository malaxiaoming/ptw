-- Add pdf_path column to store the Supabase Storage path of the generated PDF
ALTER TABLE permits ADD COLUMN pdf_path text;
