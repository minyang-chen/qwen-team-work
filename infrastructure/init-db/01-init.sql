-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    nfs_workspace_path VARCHAR(500) NOT NULL,
    mongo_database_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_mongo_db ON users(mongo_database_name);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name VARCHAR(255) UNIQUE NOT NULL,
    specialization VARCHAR(255),
    description TEXT,
    nfs_workspace_path VARCHAR(500) NOT NULL,
    mongo_database_name VARCHAR(255),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_teams_name ON teams(team_name);
CREATE INDEX idx_teams_mongo_db ON teams(mongo_database_name);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_status ON team_members(status);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_key ON api_keys(api_key);

-- File embeddings table for vector search
CREATE TABLE IF NOT EXISTS file_embeddings (
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
