-- CreateTable
CREATE TABLE "gym_registration_fees" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "price_htg" DECIMAL(12,2) NOT NULL,
    "price_usd" DECIMAL(12,2),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_registration_fees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gym_registration_fees_tenant_id_idx" ON "gym_registration_fees"("tenant_id");

-- AddForeignKey
ALTER TABLE "gym_registration_fees" ADD CONSTRAINT "gym_registration_fees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_registration_fees" ADD CONSTRAINT "gym_registration_fees_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "gym_registration_fees" ADD CONSTRAINT "gym_registration_fees_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE SET NULL;