-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('NOT_CONTACTED', 'EMAILED', 'REPLIED', 'CALL_SCHEDULED', 'CALL_DONE', 'THANKED', 'REFERRED');

-- CreateEnum
CREATE TYPE "Affinity" AS ENUM ('ALUMNI', 'MAJOR', 'HOMETOWN', 'HOBBY', 'OTHER');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('EMAIL', 'LINKEDIN', 'CALL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "Tier" NOT NULL DEFAULT 'B',
    "notes" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "fullName" TEXT NOT NULL,
    "title" TEXT,
    "linkedinUrl" TEXT,
    "affinity" "Affinity"[],
    "stage" "Stage" NOT NULL DEFAULT 'NOT_CONTACTED',

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outreach" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "body" TEXT,
    "repliedAt" TIMESTAMP(3),
    "followUpOn" TIMESTAMP(3),

    CONSTRAINT "Outreach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "minutes" INTEGER NOT NULL DEFAULT 120,
    "actions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "target" INTEGER NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_userId_name_key" ON "Company"("userId", "name");

-- CreateIndex
CREATE INDEX "Contact_userId_stage_idx" ON "Contact"("userId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "Goal_userId_weekOf_key" ON "Goal"("userId", "weekOf");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outreach" ADD CONSTRAINT "Outreach_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
