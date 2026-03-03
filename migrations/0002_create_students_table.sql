-- Migration: Create students table
-- Run: wrangler d1 execute bukber-orders --file=./migrations/0002_create_students_table.sql

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    no INTEGER NOT NULL,
    nama TEXT NOT NULL,
    nim TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Create index for faster querying by NIM
CREATE INDEX IF NOT EXISTS idx_students_nim ON students(nim);
CREATE INDEX IF NOT EXISTS idx_students_nama ON students(nama);
