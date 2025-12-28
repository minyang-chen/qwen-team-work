#!/bin/bash

# List all user and team MongoDB databases
# This script shows all databases created for users and teams

echo "=== MongoDB Databases Overview ==="
echo ""

# Check if MongoDB is running
if ! docker ps | grep -q team-mongodb; then
    echo "✗ MongoDB container is not running"
    echo "  Start it with: docker-compose -f infrastructure/infrastructure.yml up -d mongodb"
    exit 1
fi

echo "Fetching databases from MongoDB..."
echo ""

# Get all databases
ALL_DBS=$(docker exec team-mongodb mongosh -u admin -p changeme --authenticationDatabase admin --quiet --eval "db.adminCommand('listDatabases').databases.map(db => db.name).join('\n')" 2>/dev/null)

# Filter user databases
USER_DBS=$(echo "$ALL_DBS" | grep "^user_" || true)
if [ -n "$USER_DBS" ]; then
    USER_COUNT=$(echo "$USER_DBS" | wc -l)
else
    USER_COUNT=0
fi

# Filter team databases
TEAM_DBS=$(echo "$ALL_DBS" | grep "^team_" || true)
if [ -n "$TEAM_DBS" ]; then
    TEAM_COUNT=$(echo "$TEAM_DBS" | wc -l)
else
    TEAM_COUNT=0
fi

echo "📊 Summary:"
echo "  User databases: $USER_COUNT"
echo "  Team databases: $TEAM_COUNT"
echo ""

if [ "$USER_COUNT" -gt 0 ]; then
    echo "👤 User Databases:"
    echo "$USER_DBS" | while read -r db; do
        if [ -n "$db" ]; then
            # Get collections count
            COLLECTIONS=$(docker exec team-mongodb mongosh -u admin -p changeme --authenticationDatabase admin --quiet --eval "use $db; db.getCollectionNames().length" 2>/dev/null)
            echo "  - $db ($COLLECTIONS collections)"
        fi
    done
    echo ""
fi

if [ "$TEAM_COUNT" -gt 0 ]; then
    echo "👥 Team Databases:"
    echo "$TEAM_DBS" | while read -r db; do
        if [ -n "$db" ]; then
            # Get collections count
            COLLECTIONS=$(docker exec team-mongodb mongosh -u admin -p changeme --authenticationDatabase admin --quiet --eval "use $db; db.getCollectionNames().length" 2>/dev/null)
            echo "  - $db ($COLLECTIONS collections)"
        fi
    done
    echo ""
fi

if [ "$USER_COUNT" -eq 0 ] && [ "$TEAM_COUNT" -eq 0 ]; then
    echo "No user or team databases found."
    echo "Databases will be created automatically when users sign up or teams are created."
    echo ""
fi

echo "=== End of Report ==="
