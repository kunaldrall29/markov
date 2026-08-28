FROM oven/bun:1.4.0
WORKDIR /app
COPY package.json bun.lock bunfig.toml tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN bun install --frozen-lockfile || bun install
ENV PORT=8789
ENV HOST=0.0.0.0
EXPOSE 8789
CMD ["bun", "apps/bot/src/index.ts"]
