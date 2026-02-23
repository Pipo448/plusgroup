-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "exchangeRates" TEXT DEFAULT '{}',
ADD COLUMN     "showExchangeRate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visibleCurrencies" TEXT DEFAULT '["USD"]';
