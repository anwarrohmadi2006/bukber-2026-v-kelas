-- Migration: Create orders table
-- Run: wrangler d1 execute bukber-orders --file=./migrations/0001_create_orders_table.sql

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL,
    items TEXT NOT NULL,
    sub_total INTEGER NOT NULL,
    subsidy_applied INTEGER NOT NULL,
    final_total INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_name ON orders(user_name);
