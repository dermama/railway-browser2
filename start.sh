#!/bin/bash

# Default port to 8080 if not provided by Railway
export PORT=${PORT:-8080}

echo "Starting Remote Browser on port $PORT..."

# Start supervisor
/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
