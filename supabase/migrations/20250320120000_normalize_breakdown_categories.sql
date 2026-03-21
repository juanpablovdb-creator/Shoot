-- Paso 1/2: valores del enum breakdown_category alineados al desglose canónico.
-- (Los UPDATE van en migración aparte: PG no permite usar labels nuevos en la misma transacción que ADD VALUE.)

ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'cast';
ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'extras';
ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'stunts';
ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'spfx';
ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'vfx';
ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'armas';
ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'animales';
ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'vehiculos';
ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'coordinacion_intimidad';
ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'utileria';
ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'vestuario';
ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'maq_pelo';
ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'maq_fx';
ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'arte';
ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'fotografia';
ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'sonido';
ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'fotografias';
ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'musica';
ALTER TYPE public.breakdown_category ADD VALUE IF NOT EXISTS 'observaciones';
