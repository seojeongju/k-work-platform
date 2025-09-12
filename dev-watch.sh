#!/bin/bash

echo "🚀 Starting development with auto-reload..."
echo "📝 Files will be watched for changes"
echo "🌐 Local preview available after build"

# 파일 변경 감지하여 자동 빌드
npx nodemon --watch src --watch public --ext ts,tsx,js,html,css --exec "npm run build && echo '✅ Build completed at $(date)'"
