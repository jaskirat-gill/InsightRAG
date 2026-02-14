FROM node:22-alpine

# Create a non-root user matching the host UID/GID to avoid permission issues
ARG UID=1000
ARG GID=1000
RUN addgroup -g $GID appuser && adduser -u $UID -G appuser -s /bin/sh -D appuser

WORKDIR /app

# Install dependencies as root first, then fix ownership
COPY package.json package-lock.json* ./
RUN npm install && chown -R appuser:appuser /app

# Switch to non-root user for all subsequent operations
USER appuser

COPY --chown=appuser:appuser . .

CMD ["npm", "run", "dev", "--", "--host"]
