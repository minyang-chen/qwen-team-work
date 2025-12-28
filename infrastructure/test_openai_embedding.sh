# curl http://10.0.0.82:8080/embeddings \
#      -H "Content-Type: application/json" \
#      -d '{ "input": "The quick brown fox jumps over the lazy dog." }'

curl http://10.0.0.139:30000/v1/embeddings \
      -H "Content-Type: application/json" \
      -d '{ "input": "The quick brown fox jumps over the lazy dog." }'
