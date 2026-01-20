-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BANNED', 'LOCKED_ASSET_PROTECTION');

-- CreateEnum
CREATE TYPE "ActivationCodeStatus" AS ENUM ('UNUSED', 'USED', 'FROZEN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "membership_expire_at" TIMESTAMP(3),
    "api_key" TEXT,
    "is_legal_signed" BOOLEAN NOT NULL DEFAULT false,
    "device_fingerprint_count" INTEGER NOT NULL DEFAULT 0,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relay_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "buy_link" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relay_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_domains" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "workflow_config" JSONB,
    "target_model" TEXT,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "is_maintenance" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activation_codes" (
    "code" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "batch_tag" TEXT,
    "status" "ActivationCodeStatus" NOT NULL DEFAULT 'UNUSED',
    "used_by" TEXT,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activation_codes_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "legal_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "signature_text" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_histories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "domain_id" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");

-- CreateIndex
CREATE INDEX "system_configs_key_idx" ON "system_configs"("key");

-- CreateIndex
CREATE INDEX "relay_configs_is_active_idx" ON "relay_configs"("is_active");

-- CreateIndex
CREATE INDEX "ai_domains_is_visible_is_maintenance_idx" ON "ai_domains"("is_visible", "is_maintenance");

-- CreateIndex
CREATE INDEX "ai_domains_sort_order_idx" ON "ai_domains"("sort_order");

-- CreateIndex
CREATE INDEX "activation_codes_status_idx" ON "activation_codes"("status");

-- CreateIndex
CREATE INDEX "activation_codes_batch_tag_idx" ON "activation_codes"("batch_tag");

-- CreateIndex
CREATE INDEX "activation_codes_used_by_idx" ON "activation_codes"("used_by");

-- CreateIndex
CREATE INDEX "legal_logs_user_id_idx" ON "legal_logs"("user_id");

-- CreateIndex
CREATE INDEX "legal_logs_created_at_idx" ON "legal_logs"("created_at");

-- CreateIndex
CREATE INDEX "chat_histories_user_id_idx" ON "chat_histories"("user_id");

-- CreateIndex
CREATE INDEX "chat_histories_domain_id_idx" ON "chat_histories"("domain_id");

-- CreateIndex
CREATE INDEX "chat_histories_created_at_idx" ON "chat_histories"("created_at");

-- AddForeignKey
ALTER TABLE "legal_logs" ADD CONSTRAINT "legal_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_histories" ADD CONSTRAINT "chat_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_histories" ADD CONSTRAINT "chat_histories_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "ai_domains"("id") ON DELETE SET NULL ON UPDATE CASCADE;
