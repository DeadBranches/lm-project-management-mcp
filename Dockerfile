# SPDX-License-Identifier: MIT
# SPDX-FileCopyrightText: 2005 Tejpavirk <https://github.com/tejpalvirk>
# SPDX-FileCopyrightText: 2025 The DeadBranches contributors <https://github.com/DeadBranches>

FROM node:22.12-alpine AS builder

COPY project /app
COPY tsconfig.json /tsconfig.json

WORKDIR /app

RUN --mount=type=cache,target=/root/.npm npm install

RUN --mount=type=cache,target=/root/.npm-production npm ci --ignore-scripts --omit-dev

FROM node:22-alpine AS release

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json
COPY --from=builder /app/memory.json /app/memory.json

ENV NODE_ENV=production
ENV MEMORY_FILE_PATH=/app/memory.json

WORKDIR /app

RUN npm ci --ignore-scripts --omit-dev

ENTRYPOINT ["node", "dist/project_index.js"] 