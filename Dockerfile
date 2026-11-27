# Runs the Next.js dashboard (packages/website) as a long-running Node server.
# Works on Hugging Face Spaces (Docker SDK, port 7860) or any container host.
FROM node:20-slim

ENV NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production PORT=7860
WORKDIR /app

# Install workspace dependencies from the lockfile
COPY --chown=node package.json package-lock.json ./
COPY --chown=node packages/website/package.json packages/website/
RUN npm ci --include=dev

COPY --chown=node packages ./packages

# The Clerk publishable key is public and is inlined into the client bundle at build time.
# CLERK_SECRET_KEY is only needed at runtime (set it as a secret on the host).
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
RUN npm run build -w website && chown -R node:node /app

USER node
WORKDIR /app/packages/website
EXPOSE 7860
CMD ["sh", "-c", "npx next start -H 0.0.0.0 -p ${PORT}"]
