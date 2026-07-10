#!/bin/bash
BASE_URL="https://8365332c.kittens-mvp-live.pages.dev"
OUTPUT_DIR="/d/project/kittens-mvp-live"

echo "开始下载 1750 个文件..."
total=0
success=0
failed=0

while IFS= read -r file; do
  ((total++))
  
  # 创建目录
  dir=$(dirname "$OUTPUT_DIR$file")
  mkdir -p "$dir"
  
  # 下载文件
  if curl -sf "$BASE_URL$file" -o "$OUTPUT_DIR$file"; then
    ((success++))
    echo "[$success/$total] ✓ $file"
  else
    ((failed++))
    echo "[$total] ✗ FAILED: $file"
  fi
  
  # 每下载 50 个文件显示进度
  if [ $((total % 50)) -eq 0 ]; then
    echo "===== 进度: $total/1750 | 成功: $success | 失败: $failed ====="
  fi
done < file_list.txt

echo ""
echo "下载完成！"
echo "总计: $total | 成功: $success | 失败: $failed"
