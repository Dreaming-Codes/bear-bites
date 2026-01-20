-- Bear Bites Database Schema
-- Migration: 0001_initial
-- Description: Initial schema for Better Auth + App tables

-- ============================================
-- BETTER AUTH TABLES (camelCase column names)
-- ============================================

-- User table
CREATE TABLE "user" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" INTEGER NOT NULL DEFAULT 0,
  "image" TEXT,
  "createdAt" DATE NOT NULL DEFAULT (datetime('now')),
  "updatedAt" DATE NOT NULL DEFAULT (datetime('now'))
);

-- Session table
CREATE TABLE "session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "expiresAt" DATE NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "createdAt" DATE NOT NULL DEFAULT (datetime('now')),
  "updatedAt" DATE NOT NULL DEFAULT (datetime('now')),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
);

-- Account table (for OAuth providers)
CREATE TABLE "account" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" DATE,
  "refreshTokenExpiresAt" DATE,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" DATE NOT NULL DEFAULT (datetime('now')),
  "updatedAt" DATE NOT NULL DEFAULT (datetime('now'))
);

-- Verification table (for email verification, password reset, etc.)
CREATE TABLE "verification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" DATE NOT NULL,
  "createdAt" DATE NOT NULL DEFAULT (datetime('now')),
  "updatedAt" DATE NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- APPLICATION TABLES
-- ============================================

-- Favorites table - stores user's favorite food items
CREATE TABLE "favorite" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "foodId" TEXT NOT NULL,
  "foodName" TEXT NOT NULL,
  "locationNum" TEXT NOT NULL,
  "locationName" TEXT,
  "addedAt" DATE NOT NULL DEFAULT (datetime('now')),
  UNIQUE("userId", "foodId")
);

-- Meal plan entries - for tracking daily nutrition
CREATE TABLE "mealPlanEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "date" TEXT NOT NULL,
  "mealType" TEXT NOT NULL,
  "foodId" TEXT NOT NULL,
  "foodName" TEXT NOT NULL,
  "servingSize" TEXT,
  "calories" INTEGER,
  "protein" REAL,
  "carbs" REAL,
  "fat" REAL,
  "fiber" REAL,
  "sodium" REAL,
  "createdAt" DATE NOT NULL DEFAULT (datetime('now')),
  UNIQUE("userId", "date", "mealType", "foodId")
);

-- ============================================
-- INDEXES
-- ============================================

-- Session lookups
CREATE INDEX "session_userId_idx" ON "session" ("userId");

-- Account lookups
CREATE INDEX "account_userId_idx" ON "account" ("userId");

-- Verification lookups
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");

-- Favorite lookups
CREATE INDEX "favorite_userId_idx" ON "favorite" ("userId");
CREATE INDEX "favorite_foodId_idx" ON "favorite" ("foodId");

-- Meal plan lookups
CREATE INDEX "mealPlanEntry_userId_idx" ON "mealPlanEntry" ("userId");
CREATE INDEX "mealPlanEntry_date_idx" ON "mealPlanEntry" ("userId", "date");
