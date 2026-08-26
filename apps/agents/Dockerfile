FROM oven/bun:1.4.0
WORKDIR /app
COPY package.json bun.lock bunfig.toml tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN bun install --frozen-lockfile || bun install
ENV PORT=8791
EXPOSE 8791
CMD ["bun", "apps/agents/src/index.ts"]
