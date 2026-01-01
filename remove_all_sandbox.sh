docker ps -q --filter "name=qwen-sandbox-" | xargs -r docker stop && docker ps -aq --filter "name=qwen-sandbox-" | xargs -r docker rm

