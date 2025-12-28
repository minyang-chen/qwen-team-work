#!/bin/bash

# Setup MongoDB databases for existing users and teams
# This script creates MongoDB databases for users/teams that don't have them yet

echo "=== Setting up MongoDB for existing users and teams ==="
echo ""

# Check prerequisites
if ! docker ps | grep -q team-postgres; then
    echo "✗ PostgreSQL container not running"
    exit 1
fi

if ! docker ps | grep -q team-mongodb; then
    echo "✗ MongoDB container not running"
    exit 1
fi

# Get users without MongoDB database
echo "1. Checking users without MongoDB databases..."
USERS=$(docker exec team-postgres psql -U admin -d qwen_users -t -c "SELECT id FROM users WHERE mongo_database_name IS NULL OR mongo_database_name = ''")

USER_COUNT=$(echo "$USERS" | grep -v '^$' | wc -l)
echo "   Found $USER_COUNT users needing MongoDB setup"

# Setup MongoDB for each user
if [ "$USER_COUNT" -gt 0 ]; then
    echo ""
    echo "2. Creating MongoDB databases for users..."
    echo "$USERS" | while read -r user_id; do
        user_id=$(echo "$user_id" | xargs)
        if [ -n "$user_id" ]; then
            db_name="user_${user_id//-/_}"
            echo "   - Creating database: $db_name"
            
            # Create database and collections
            docker exec team-mongodb mongosh -u admin -p changeme --authenticationDatabase admin --quiet --eval "
                use $db_name;
                db.createCollection('tasks');
                db.createCollection('todos');
                db.createCollection('chat_sessions');
                db.createCollection('projects');
                db.tasks.createIndex({ created_at: -1 });
                db.chat_sessions.createIndex({ created_at: -1 });
            " > /dev/null 2>&1
            
            # Update PostgreSQL
            docker exec team-postgres psql -U admin -d qwen_users -c "UPDATE users SET mongo_database_name = '$db_name' WHERE id = '$user_id'" > /dev/null 2>&1
            
            echo "     ✓ Database created and linked"
        fi
    done
fi

# Get teams without MongoDB database
echo ""
echo "3. Checking teams without MongoDB databases..."
TEAMS=$(docker exec team-postgres psql -U admin -d qwen_users -t -c "SELECT id FROM teams WHERE mongo_database_name IS NULL OR mongo_database_name = ''")

TEAM_COUNT=$(echo "$TEAMS" | grep -v '^$' | wc -l)
echo "   Found $TEAM_COUNT teams needing MongoDB setup"

# Setup MongoDB for each team
if [ "$TEAM_COUNT" -gt 0 ]; then
    echo ""
    echo "4. Creating MongoDB databases for teams..."
    echo "$TEAMS" | while read -r team_id; do
        team_id=$(echo "$team_id" | xargs)
        if [ -n "$team_id" ]; then
            db_name="team_${team_id//-/_}"
            echo "   - Creating database: $db_name"
            
            # Create database and collections
            docker exec team-mongodb mongosh -u admin -p changeme --authenticationDatabase admin --quiet --eval "
                use $db_name;
                db.createCollection('tasks');
                db.createCollection('projects');
                db.createCollection('chat_sessions');
                db.createCollection('documents');
                db.tasks.createIndex({ created_at: -1 });
                db.projects.createIndex({ created_at: -1 });
                db.chat_sessions.createIndex({ created_at: -1 });
            " > /dev/null 2>&1
            
            # Update PostgreSQL
            docker exec team-postgres psql -U admin -d qwen_users -c "UPDATE teams SET mongo_database_name = '$db_name' WHERE id = '$team_id'" > /dev/null 2>&1
            
            echo "     ✓ Database created and linked"
        fi
    done
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Summary:"
echo "  - Users processed: $USER_COUNT"
echo "  - Teams processed: $TEAM_COUNT"
echo ""
echo "Run './infrastructure/list_mongo_databases.sh' to verify."
