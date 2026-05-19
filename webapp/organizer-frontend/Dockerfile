FROM node:24-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

# 生产构建：API 走 Nginx 同源代理 /api；学生端链接供控场页提示
ARG VITE_API_URL=
ARG VITE_STUDENT_URL=http://localhost/games
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STUDENT_URL=$VITE_STUDENT_URL

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
