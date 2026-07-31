ALTER TABLE "public"."reconciliations"
ADD COLUMN "ofx_imported" boolean DEFAULT false,
ADD COLUMN "bank_divergence" numeric DEFAULT 0,
ADD COLUMN "machine_fees" numeric DEFAULT 0;
