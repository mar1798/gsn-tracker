FROM node:22-alpine
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter @gsc/api...
WORKDIR /repo/apps/api
EXPOSE 3000
CMD ["pnpm", "start"]
