#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 수정할 파일 경로
const filePath = 'src/api/functional/food/categories/index.ts';

// 파일 읽기
let content = fs.readFileSync(filePath, 'utf8');

// Nestia가 import를 자동 생성하지 않으므로 수동으로 추가
if (!content.includes('import type { IFoodCategory }')) {
  // 기존 import 문들 다음에 추가 (구조체 파일에서 가져오기)
  const importInsertPoint = content.indexOf('import typia from "typia";') + 'import typia from "typia";'.length;
  const beforeImport = content.substring(0, importInsertPoint);
  const afterImport = content.substring(importInsertPoint);

  content = beforeImport + '\n\nimport type { IFoodCategory } from "../../../structures/food/IFoodCategory";' + afterImport;

  // 파일 쓰기
  fs.writeFileSync(filePath, content);
  console.log('✅ IFoodCategory import 추가 완료 (structures에서 import)');
} else {
  console.log('✅ IFoodCategory import가 이미 존재합니다');
}
