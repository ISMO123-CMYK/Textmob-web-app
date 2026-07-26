-- Add boost_score and boosted columns to Posts table
ALTER TABLE "Posts" ADD COLUMN IF NOT EXISTS boost_score INTEGER DEFAULT 0;
ALTER TABLE "Posts" ADD COLUMN IF NOT EXISTS boosted BOOLEAN DEFAULT FALSE;

-- Run this in your Supabase SQL editor for the Posts database (supabase2)
-- https://supabase.com/dashboard/project/ycgczjvuygmunmksarzg/sql/new
