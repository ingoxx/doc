# 第一阶段：编译前端代码
FROM node:18-alpine AS builder
WORKDIR /app
# 启用 pnpm
RUN corepack enable

# 安装依赖
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# 复制源码并打包
COPY . .
RUN pnpm run build

# 第二阶段：运行 Nginx 服务器
FROM nginx:alpine
# 将打包好的 dist 目录复制到 Nginx 默认静态文件目录
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]