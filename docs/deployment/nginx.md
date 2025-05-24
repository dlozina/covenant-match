# Nginx

## IP Whitelist

The IP whitelist is a configuration file that allows you to specify which IP addresses are allowed to access the server.

## Restart Nginx -> to Change IP Whitelist

Go inside the nginx container:

```bash
docker exec -it  covenant-match_nginx.1.m6a5r1qmdpt8up57vkm9vzs3g sh
```

Change the IP whitelist in the `allowed_ips.conf` file.

```bash
vi /etc/nginx/sites/allowed_ips.conf
```

Then reload Nginx:

```bash
docker exec covenant-match_nginx.1.m6a5r1qmdpt8up57vkm9vzs3g nginx -s reload
```