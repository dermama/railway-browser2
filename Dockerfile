FROM debian:bookworm-slim

# Avoid prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    xvfb \
    x11vnc \
    fluxbox \
    supervisor \
    net-tools \
    websockify \
    curl \
    git \
    python3 \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Install noVNC 1.4.0 from GitHub
RUN git clone --depth 1 --branch v1.4.0 https://github.com/novnc/noVNC.git /usr/share/novnc \
    && ln -s /usr/share/novnc/vnc_lite.html /usr/share/novnc/index.html

# Environment variables
ENV DISPLAY=:0
ENV RESOLUTION=1024x768x16

# Create necessary directories
RUN mkdir -p /root/.vnc /var/run/nginx /var/log/nginx

# Copy configuration files
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY nginx.conf /etc/nginx/nginx.conf
COPY dashboard.py /dashboard.py
COPY start.sh /start.sh
RUN chmod +x /start.sh
COPY extension /extension

# Expose the port Railway will use
EXPOSE 8080

CMD ["/start.sh"]
