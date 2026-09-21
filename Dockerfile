# Use a lightweight Node.js image
FROM node:22-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install FFmpeg (audio relay + clip transcoding). On amd64 also install the
# Intel VAAPI driver so clip transcoding can use Quick Sync hardware encoding
# (e.g. a NUC) when /dev/dri is passed through. The driver only exists for
# amd64, so other architectures (e.g. arm64 / Apple Silicon) get plain ffmpeg
# and software x264. Either way, transcoding falls back to software
# automatically if the driver or device isn't usable.
RUN apt-get update \
    && apt-get install -y ffmpeg \
    && if [ "$(dpkg --print-architecture)" = "amd64" ]; then apt-get install -y intel-media-va-driver vainfo; fi \
    && rm -rf /var/lib/apt/lists/*

# Install npm dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the frontend and bundle the server
RUN npm run build

# Expose the default port (informational only — docker-compose.yml uses
# network_mode: host, so the actual bind port is whatever PORT is set to there)
EXPOSE 8100

# Start the application
CMD ["npm", "start"]
