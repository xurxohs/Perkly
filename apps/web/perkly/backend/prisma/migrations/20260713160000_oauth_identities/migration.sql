ALTER TABLE "User" ADD COLUMN "appleSub" TEXT;
CREATE UNIQUE INDEX "User_appleSub_key" ON "User"("appleSub");
