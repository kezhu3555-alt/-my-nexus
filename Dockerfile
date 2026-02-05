# 使用 Node 18 镜像
FROM node:18

# 设置工作目录
WORKDIR /app

# 先复制依赖文件并安装
COPY package*.json ./
RUN npm install

# 复制所有文件
COPY . .

# 如果 AI Studio 使用了 Vite/React (有 build 命令)，请取消下面这行的注释
# RUN npm run build

# 暴露 Hugging Face 强制要求的 7860 端口
ENV PORT=7860
EXPOSE 7860

# 启动服务器
CMD ["node", "server.js"]