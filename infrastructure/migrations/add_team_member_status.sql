-- Add status column to team_members table
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled'));

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
