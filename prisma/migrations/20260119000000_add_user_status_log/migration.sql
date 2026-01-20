-- CreateTable
CREATE TABLE "user_status_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "previous_status" "UserStatus" NOT NULL,
    "new_status" "UserStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "operator_email" TEXT NOT NULL,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_status_logs_user_id_idx" ON "user_status_logs"("user_id");

-- CreateIndex
CREATE INDEX "user_status_logs_created_at_idx" ON "user_status_logs"("created_at");

-- AddForeignKey
ALTER TABLE "user_status_logs" ADD CONSTRAINT "user_status_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
