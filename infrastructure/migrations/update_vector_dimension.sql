-- Migration: Update vector dimension from 1536 to 768
-- This matches the embedding model output dimension

-- Drop the existing table and recreate with correct dimension
DROP TABLE IF EXISTS file_embeddings CASCADE;

CREATE TABLE file_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_path VARCHAR(1000) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    workspace_type VARCHAR(20) NOT NULL CHECK (workspace_type IN ('private', 'team')),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    content_hash VARCHAR(64) NOT NULL,
    embedding vector(768),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_file_embeddings_path ON file_embeddings(file_path);
CREATE INDEX idx_file_embeddings_owner ON file_embeddings(owner_id);
CREATE INDEX idx_file_embeddings_team ON file_embeddings(team_id);
CREATE INDEX idx_file_embeddings_vector ON file_embeddings USING hnsw (embedding vector_cosine_ops);
