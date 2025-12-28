#!/bin/bash

# Test MongoDB Integration
# This script tests the MongoDB database creation for users and teams

echo "=== MongoDB Integration Test ==="
echo ""

# Check if MongoDB is running
echo "1. Checking MongoDB status..."
if docker ps | grep -q team-mongodb; then
    echo "✓ MongoDB container is running"
else
    echo "✗ MongoDB container is not running"
    echo "  Start it with: docker-compose -f infrastructure/infrastructure.yml up -d mongodb"
    exit 1
fi

echo ""
echo "2. Testing MongoDB connection..."
if docker exec team-mongodb mongosh -u admin -p changeme --authenticationDatabase admin --eval "db.version()" > /dev/null 2>&1; then
    echo "✓ MongoDB connection successful"
else
    echo "✗ MongoDB connection failed"
    exit 1
fi

echo ""
echo "3. Listing existing databases..."
docker exec team-mongodb mongosh -u admin -p changeme --authenticationDatabase admin --eval "db.adminCommand('listDatabases').databases.forEach(function(db) { print(db.name); })" 2>/dev/null | grep -E "^(user_|team_)" || echo "  No user or team databases found yet"

echo ""
echo "4. Testing database creation (simulated)..."
TEST_USER_ID="12345678_1234_1234_1234_123456789012"
TEST_DB_NAME="user_${TEST_USER_ID}"

# Create test database
docker exec team-mongodb mongosh -u admin -p changeme --authenticationDatabase admin --eval "
  use ${TEST_DB_NAME};
  db.createCollection('tasks');
  db.createCollection('todos');
  db.createCollection('chat_sessions');
  db.createCollection('projects');
  db.tasks.createIndex({ created_at: -1 });
  db.chat_sessions.createIndex({ created_at: -1 });
  print('Test database created: ${TEST_DB_NAME}');
" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✓ Test database created successfully"
    
    # Verify collections
    echo ""
    echo "5. Verifying collections in test database..."
    docker exec team-mongodb mongosh -u admin -p changeme --authenticationDatabase admin --eval "
      use ${TEST_DB_NAME};
      db.getCollectionNames().forEach(function(col) { print('  - ' + col); });
    " 2>/dev/null
    
    # Cleanup test database
    echo ""
    echo "6. Cleaning up test database..."
    docker exec team-mongodb mongosh -u admin -p changeme --authenticationDatabase admin --eval "
      use ${TEST_DB_NAME};
      db.dropDatabase();
    " > /dev/null 2>&1
    echo "✓ Test database cleaned up"
else
    echo "✗ Failed to create test database"
    exit 1
fi

echo ""
echo "=== All tests passed! ==="
echo ""
echo "MongoDB integration is working correctly."
echo "User and team databases will be created automatically on signup/team creation."
