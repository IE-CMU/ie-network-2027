# IE Network 2027 Prototype
- `docker build -t nnnpooh/ie_network_2027:latest .`
- `docker push nnnpooh/ie_network_2027:latest`


`run.sh`
```
#!/bin/sh
docker rm -f ie-network-2027
docker pull nnnpooh/ie_network_2027:latest
docker run -d --env-file .env.local --name ie-network-2027 -p 3010:80 nnnpooh/ie_network_2027
```


docker compose --env-file .env up -d