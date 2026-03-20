-- Consolida categorías de desglose al conjunto canónico tipo Movie Magic (ver src/lib/constants/categories.ts).

UPDATE public.breakdown_elements SET category = 'extras' WHERE category = 'figurantes';
UPDATE public.breakdown_elements SET category = 'maq_pelo' WHERE category = 'maquillaje';
UPDATE public.breakdown_elements SET category = 'arte' WHERE category = 'grafica_archivo';
UPDATE public.breakdown_elements SET category = 'musica' WHERE category = 'coreografia_baile';
UPDATE public.breakdown_elements SET category = 'observaciones' WHERE category IN ('notes', 'produccion');
