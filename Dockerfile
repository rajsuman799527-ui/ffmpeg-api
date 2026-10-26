FROM node:20-slim

# ffmpeg + fonts for burned-in captions (Latin and Devanagari/Hindi)
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core fonts-lohit-deva && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json .
COPY server.js .

CMD ["node","server.js"]
