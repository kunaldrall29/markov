FROM oven/bun:1.4.0
WORKDIR /app
COPY package.json bun.lock bunfig.toml tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
COPY scripts ./scripts
COPY data ./data
RUN bun install --frozen-lockfile || bun install
ENV PORT=8787
ENV HOST=0.0.0.0
EXPOSE 8787
CMD ["bun", "apps/api/src/index.ts"]
