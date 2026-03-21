-- Paso 2/2: reasignar filas legacy tras existir los labels en el enum (migración anterior).

UPDATE public.breakdown_elements SET category = 'extras' WHERE category::text = 'figurantes';
UPDATE public.breakdown_elements SET category = 'maq_pelo' WHERE category::text = 'maquillaje';
UPDATE public.breakdown_elements SET category = 'arte' WHERE category::text = 'grafica_archivo';
UPDATE public.breakdown_elements SET category = 'musica' WHERE category::text = 'coreografia_baile';
UPDATE public.breakdown_elements SET category = 'observaciones' WHERE category::text IN ('notes', 'produccion');
