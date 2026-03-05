#!/bin/sh
set -e
# Sustituir la URL del API en index.html (inyección en tiempo de ejecución)
if [ -n "$ZENTRA_API_URL" ]; then
    sed -i "s|__ZENTRA_API_URL__|$ZENTRA_API_URL|g" /usr/share/nginx/html/index.html
else
    sed -i "s|__ZENTRA_API_URL__|http://localhost:8080|g" /usr/share/nginx/html/index.html
fi
exec nginx -g 'daemon off;'
