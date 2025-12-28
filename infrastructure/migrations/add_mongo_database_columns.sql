-- Add mongo_database_name column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS mongo_database_name VARCHAR(255);

-- Add mongo_database_name column to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS mongo_database_name VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_mongo_db ON users(mongo_database_name);
CREATE INDEX IF NOT EXISTS idx_teams_mongo_db ON teams(mongo_database_name);
