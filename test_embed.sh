curl http://10.0.0.139:30000/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-oss:20b",
    "input": ["The first text to embed", "The second text to embed"]
  }'

