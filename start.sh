#!/bin/bash

# Переходим в директорию скрипта, чтобы его можно было запускать откуда угодно
cd "$(dirname "$0")"

echo "Starting Backend..."
cd backend
npm install
npx prisma generate
npx prisma db push
npm run start:dev &
BACKEND_PID=$!

echo "Starting Frontend..."
cd ../frontend
npm install
npm run dev &
FRONTEND_PID=$!

echo "Both Backend (PID: $BACKEND_PID) and Frontend (PID: $FRONTEND_PID) are running."
echo "Press Ctrl+C to stop both."

wait
