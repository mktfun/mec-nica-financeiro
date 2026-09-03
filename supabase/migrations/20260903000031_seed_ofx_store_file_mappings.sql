-- Migration: 20260903000031_seed_ofx_store_file_mappings.sql
-- Inserção de aliases canônicos bancários das 10 filiais para auto-associação persistente

INSERT INTO public.store_file_mappings (file_alias, store_id, store_name, updated_at)
VALUES
  -- Dom Pedro - DP (st-01) - Agência 8813 Conta 98463-3
  ('8813984633', 'st-01', 'Dom Pedro - DP', now()),
  ('8813_984633', 'st-01', 'Dom Pedro - DP', now()),
  ('984633', 'st-01', 'Dom Pedro - DP', now()),
  ('Extrato_8813_984633', 'st-01', 'Dom Pedro - DP', now()),
  ('ITAU - 8813984633', 'st-01', 'Dom Pedro - DP', now()),
  ('ITAU - 984633', 'st-01', 'Dom Pedro - DP', now()),

  -- Jabaquara - JAB (st-02) - Agência 8813 Conta 98411-2
  ('8813984112', 'st-02', 'Jabaquara - JAB', now()),
  ('8813_984112', 'st-02', 'Jabaquara - JAB', now()),
  ('984112', 'st-02', 'Jabaquara - JAB', now()),
  ('Extrato_8813_984112', 'st-02', 'Jabaquara - JAB', now()),
  ('ITAU - 8813984112', 'st-02', 'Jabaquara - JAB', now()),
  ('ITAU - 984112', 'st-02', 'Jabaquara - JAB', now()),

  -- Jorge Beretta - DHJV (st-03) - Agência 3385 Conta 98804-7
  ('3385988047', 'st-03', 'Jorge Beretta - DHJV', now()),
  ('3385_988047', 'st-03', 'Jorge Beretta - DHJV', now()),
  ('988047', 'st-03', 'Jorge Beretta - DHJV', now()),
  ('Extrato_3385_988047', 'st-03', 'Jorge Beretta - DHJV', now()),
  ('ITAU - 3385988047', 'st-03', 'Jorge Beretta - DHJV', now()),
  ('ITAU - 988047', 'st-03', 'Jorge Beretta - DHJV', now()),

  -- Kennedy - MP (st-04) - Agência 7386 Conta 17529-8
  ('7386175298', 'st-04', 'Kennedy - MP', now()),
  ('7386_175298', 'st-04', 'Kennedy - MP', now()),
  ('175298', 'st-04', 'Kennedy - MP', now()),
  ('Extrato_7386_175298', 'st-04', 'Kennedy - MP', now()),
  ('ITAU - 7386175298', 'st-04', 'Kennedy - MP', now()),
  ('ITAU - 175298', 'st-04', 'Kennedy - MP', now()),

  -- Piraporinha - EMPORIO (st-05) - Agência 7386 Conta 16260-1
  ('7386162601', 'st-05', 'Piraporinha - EMPORIO', now()),
  ('7386_162601', 'st-05', 'Piraporinha - EMPORIO', now()),
  ('162601', 'st-05', 'Piraporinha - EMPORIO', now()),
  ('Extrato_7386_162601', 'st-05', 'Piraporinha - EMPORIO', now()),
  ('ITAU - 7386162601', 'st-05', 'Piraporinha - EMPORIO', now()),
  ('ITAU - 162601', 'st-05', 'Piraporinha - EMPORIO', now()),

  -- Planalto - BRASICAR (st-06) - Agência 7386 Conta 16658-6
  ('7386166586', 'st-06', 'Planalto - BRASICAR', now()),
  ('7386_166586', 'st-06', 'Planalto - BRASICAR', now()),
  ('166586', 'st-06', 'Planalto - BRASICAR', now()),
  ('Extrato_7386_166586', 'st-06', 'Planalto - BRASICAR', now()),
  ('ITAU - 7386166586', 'st-06', 'Planalto - BRASICAR', now()),
  ('ITAU - 166586', 'st-06', 'Planalto - BRASICAR', now()),

  -- Rudge Ramos - CAP (st-07) - Agência 0263 Conta 81153-1
  ('0263811531', 'st-07', 'Rudge Ramos - CAP', now()),
  ('0263_811531', 'st-07', 'Rudge Ramos - CAP', now()),
  ('811531', 'st-07', 'Rudge Ramos - CAP', now()),
  ('Extrato_0263_811531', 'st-07', 'Rudge Ramos - CAP', now()),
  ('ITAU - 0263811531', 'st-07', 'Rudge Ramos - CAP', now()),
  ('ITAU - 811531', 'st-07', 'Rudge Ramos - CAP', now()),

  -- Santo André - HD (st-08) - Agência 8813 Conta 99429-3
  ('8813994293', 'st-08', 'Santo André - HD', now()),
  ('8813_994293', 'st-08', 'Santo André - HD', now()),
  ('994293', 'st-08', 'Santo André - HD', now()),
  ('Extrato_8813_994293', 'st-08', 'Santo André - HD', now()),
  ('ITAU - 8813994293', 'st-08', 'Santo André - HD', now()),
  ('ITAU - 994293', 'st-08', 'Santo André - HD', now()),

  -- Rei do Módulo - MP (st-09) - Agência 8813 Conta 99267-7
  ('8813992677', 'st-09', 'Rei do Módulo - MP', now()),
  ('8813_992677', 'st-09', 'Rei do Módulo - MP', now()),
  ('992677', 'st-09', 'Rei do Módulo - MP', now()),
  ('Extrato_8813_992677', 'st-09', 'Rei do Módulo - MP', now()),
  ('ITAU - 8813992677', 'st-09', 'Rei do Módulo - MP', now()),
  ('ITAU - 992677', 'st-09', 'Rei do Módulo - MP', now()),

  -- Mauá - MHE (3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f) - Agência 2783 Conta 07082-0
  ('2783070820', '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', 'Maua - MHE', now()),
  ('2783_070820', '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', 'Maua - MHE', now()),
  ('070820', '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', 'Maua - MHE', now()),
  ('70820', '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', 'Maua - MHE', now()),
  ('Extrato_2783_070820', '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', 'Maua - MHE', now()),
  ('ITAU - 2783070820', '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', 'Maua - MHE', now()),
  ('ITAU - 070820', '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', 'Maua - MHE', now())

ON CONFLICT (file_alias) 
DO UPDATE SET
  store_id = EXCLUDED.store_id,
  store_name = EXCLUDED.store_name,
  updated_at = now();
