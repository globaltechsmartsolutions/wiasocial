ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS brand_memory JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_settings.brand_memory IS
  'Memoria base de marca usada por la IA: promesa, diferenciador, dolores, objeciones, pruebas, voz, límites y estilo visual.';
