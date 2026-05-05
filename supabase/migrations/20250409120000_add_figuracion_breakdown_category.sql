-- Separar "figuración" (bits) de "extras" (multitudes / atmósfera).
ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'figuracion';
