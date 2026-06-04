FROM node:24-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

ARG VITE_API_URL=
ARG VITE_ORGANIZER_URL=http://localhost:5174
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ORGANIZER_URL=$VITE_ORGANIZER_URL

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
