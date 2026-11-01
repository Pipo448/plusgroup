-- Kouri sa nan Supabase SQL Editor (opsyonèl: backend la kreye tab la poukont li si l pa egziste)
CREATE TABLE IF NOT EXISTS sol_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "fullName" TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  occupation TEXT,
  "beenInOurSol" BOOLEAN,
  "likedText" TEXT,
  "dislikedText" TEXT,
  referrer TEXT,
  "howKnow" TEXT,
  "joinedOtherSol" BOOLEAN,
  "otherSolText" TEXT,
  frequency TEXT,
  amount INTEGER,
  "amountOther" TEXT,
  slots INTEGER,
  "startWhen" TEXT,
  "canRecruit" BOOLEAN,
  "recruitList" TEXT,
  message TEXT,
  "acceptRules" BOOLEAN NOT NULL DEFAULT false,
  "acceptContact" BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'nouvo',      -- nouvo | kontakte | aksepte | refize
  "adminNote" TEXT,
  "tenantId" TEXT,
  ip TEXT,
  ua TEXT
);
CREATE INDEX IF NOT EXISTS sol_join_requests_status_idx ON sol_join_requests (status, "createdAt" DESC);

-- Pou wè demann yo rapid:
-- SELECT "createdAt", "fullName", phone, address, "beenInOurSol", referrer, "canRecruit", status
-- FROM sol_join_requests ORDER BY "createdAt" DESC;
