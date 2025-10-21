-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "p1Handle" TEXT NOT NULL,
    "p2Handle" TEXT NOT NULL,
    "ratingMin" INTEGER NOT NULL,
    "ratingMax" INTEGER NOT NULL,
    "problemCount" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "startAt" DATETIME,
    "endAt" DATETIME,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "contestId" INTEGER NOT NULL,
    "idx" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rating" INTEGER,
    "state" TEXT NOT NULL DEFAULT 'OPEN',
    "solvedBy" TEXT,
    "solvedAt" DATETIME,
    "lockedFor" TEXT,
    CONSTRAINT "Problem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");
