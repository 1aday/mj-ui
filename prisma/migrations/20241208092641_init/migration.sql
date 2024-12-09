-- CreateTable
CREATE TABLE "ImageGeneration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "imageUrl" TEXT,
    "type" TEXT NOT NULL DEFAULT 'generation',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
