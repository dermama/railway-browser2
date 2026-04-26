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
    && rm -rf /var/lib/apt/lists/*

# Install noVNC 1.4.0 from GitHub (fixes addTouchSpecificHandlers null element bug)
RUN git clone --depth 1 --branch v1.4.0 https://github.com/novnc/noVNC.git /usr/share/novnc \
    && ln -s /usr/share/novnc/vnc.html /usr/share/novnc/index.html

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
