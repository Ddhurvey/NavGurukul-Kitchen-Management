-- Add tokenVersion for invalidating previously issued authentication tokens.
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
