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
    novnc \
    websockify \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set up noVNC
RUN ln -s /usr/share/novnc/vnc.html /usr/share/novnc/index.html

# Environment variables
ENV DISPLAY=:0
ENV RESOLUTION=1280x720x24

# Create necessary directories
RUN mkdir -p /root/.vnc

# Copy configuration files and extension
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY start.sh /start.sh
RUN chmod +x /start.sh
COPY extension /extension

# Expose the port Railway will use
EXPOSE 8080

CMD ["/start.sh"]
