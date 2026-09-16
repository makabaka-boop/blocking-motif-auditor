# 公共构建阶段：安装全部依赖并产出静态文件 dist/
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 运行阶段：dist 静态文件 + 仅用来提供静态服务的 vite（含 preview 所需依赖）
FROM node:20-bookworm-slim AS web
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci
COPY --from=build /app/dist ./dist
COPY vite.config.ts ./
EXPOSE 4173
CMD ["npm", "run", "preview"]

# 一次性验收阶段：Vitest + Playwright(Chromium)，全部通过后退出
FROM build AS verify
RUN npx playwright install --with-deps chromium
ENV PLAYWRIGHT_NO_WEB_SERVER=1
ENV PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173
# 后台启动静态服务，轮询就绪后运行端到端测试；任一失败则容器退出码非 0
CMD ["sh", "-c", "npm run test && (npm run preview &) && until node -e \"fetch('http://127.0.0.1:4173').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\"; do sleep 1; done && npx playwright test"]
