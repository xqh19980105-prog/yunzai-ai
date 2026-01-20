-- AlterTable: Add available_models field to relay_configs
ALTER TABLE "relay_configs" ADD COLUMN "available_models" JSONB;
