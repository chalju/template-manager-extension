-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "enable_suggestions" BOOLEAN NOT NULL DEFAULT true,
    "suggestion_frequency" TEXT NOT NULL DEFAULT 'medium',
    "enable_history" BOOLEAN NOT NULL DEFAULT true,
    "domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageHistory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "template_id" TEXT,
    "context" TEXT NOT NULL,
    "generated_text" TEXT NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "domain" TEXT,

    CONSTRAINT "UsageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Template_user_id_idx" ON "Template"("user_id");

-- CreateIndex
CREATE INDEX "Template_keyword_idx" ON "Template"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_user_id_key" ON "UserSettings"("user_id");

-- CreateIndex
CREATE INDEX "UserSettings_user_id_idx" ON "UserSettings"("user_id");

-- CreateIndex
CREATE INDEX "UsageHistory_user_id_idx" ON "UsageHistory"("user_id");

-- CreateIndex
CREATE INDEX "UsageHistory_template_id_idx" ON "UsageHistory"("template_id");

-- CreateIndex
CREATE INDEX "UsageHistory_timestamp_idx" ON "UsageHistory"("timestamp");

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageHistory" ADD CONSTRAINT "UsageHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageHistory" ADD CONSTRAINT "UsageHistory_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
