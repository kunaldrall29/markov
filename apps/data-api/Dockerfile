FROM oven/bun:1.4.0
WORKDIR /app
COPY package.json bun.lock bunfig.toml tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN bun install --frozen-lockfile || bun install
ENV PORT=8788
EXPOSE 8788
CMD ["bun", "apps/data-api/src/index.ts"]
