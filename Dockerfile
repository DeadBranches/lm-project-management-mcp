# SPDX-License-Identifier: MIT
# SPDX-FileCopyrightText: 2005 Tejpavirk <https://github.com/tejpalvirk>
# SPDX-FileCopyrightText: 2025 The DeadBranches contributors <https://github.com/DeadBranches>

FROM node:22.12-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY index.ts ./
COPY project_*.txt ./

RUN --mount=type=cache,target=/root/.npm npm ci
RUN npm run build

FROM node:22-alpine AS release

ENV NODE_ENV=production
ENV MEMORY_FILE_PATH=/app/memory.json
ENV SESSIONS_FILE_PATH=/app/sessions.json

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/project_*.txt ./

ENTRYPOINT ["node", "dist/index.js"]
