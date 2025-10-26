# 테스트 가이드

## 🚀 빠른 시작

```bash
# 1. 테스트 빌드
bun run bun:build:test

# 2. 테스트 실행
bun run bun:test              # 단위 테스트
bun run bun:test:integration  # 통합 테스트
bun run bun:test:all          # 전체 테스트
```

## 📁 폴더 구조

```
test/features/
├── unit/                           # 단위 테스트 (개별 함수/서비스)
│   ├── utils/
│   │   └── test_coordinate_util.ts
│   └── services/
│       ├── test_food_scoring_service.ts
│       ├── test_food_service.ts
│       └── test_integrated_scoring_service.ts
│
├── integration/                     # 통합 테스트 (여러 서비스 연동)
│   └── services/
│       └── test_service_integration.ts
│
└── e2e/                            # E2E 테스트 (API 엔드포인트)
    └── api/
        └── test_food_api.ts
```

## 📝 테스트 작성 방법

### 1. 단위 테스트

**목적**: 개별 함수나 클래스를 독립적으로 테스트

```typescript
// test/features/unit/services/test_my_service.ts
import { MyService } from "../../../../src/services/MyService";

export default async function test_my_service(): Promise<void> {
  console.log("=== MyService 단위 테스트 시작 ===\n");

  const service = new MyService();

  // 테스트 1
  console.log("테스트 1: 기본 동작");
  const result = service.doSomething();

  if (result !== "expected") {
    throw new Error(`Expected 'expected', got '${result}'`);
  }
  console.log("✓ 기본 동작 정상\n");

  console.log("=== ✅ 테스트 통과 ===");
}
```

**핵심 패턴**:
- `export default async function test_이름(): Promise<void>`
- `console.log()`로 진행 상황 출력
- 실패 시 `throw new Error()`
- `✓` 마크로 성공 표시

### 2. 통합 테스트

**목적**: 여러 서비스가 함께 작동하는지 테스트

```typescript
// test/features/integration/test_my_integration.ts
import { ServiceA } from "../../../src/services/ServiceA";
import { ServiceB } from "../../../src/services/ServiceB";

export default async function test_my_integration(): Promise<void> {
  const serviceA = new ServiceA();
  const serviceB = new ServiceB();

  // 실제 사용 시나리오 테스트
  const dataFromA = serviceA.getData();
  const result = await serviceB.processData(dataFromA);

  if (!result.success) {
    throw new Error("통합 실패");
  }

  console.log("✓ 통합 테스트 통과");
}
```

### 3. E2E 테스트

**목적**: HTTP API 엔드포인트 테스트

```typescript
// test/features/e2e/api/test_my_api.ts
import api from "../../../../src/api";

export default async function test_my_api(
  connection: api.IConnection,
): Promise<void> {
  // API 호출
  const response = await api.functional.my.endpoint(connection, {
    param: "value",
  });

  if (!response.success) {
    throw new Error("API 호출 실패");
  }

  console.log("✓ API 테스트 통과");
}
```

## 🎯 테스트 작성 규칙

1. **파일명**: `test_` 로 시작
2. **함수명**: `test_이름` (export default)
3. **성공**: 아무것도 return 하지 않음
4. **실패**: `throw new Error()` 던지기
5. **출력**: `console.log()`로 진행 상황 표시
6. **단위 테스트**: connection 파라미터 없음
7. **E2E 테스트**: `connection: api.IConnection` 파라미터 필요

## 📊 현재 테스트 현황

### 단위 테스트 (Unit Tests)
- ✅ CoordinateUtil (8 테스트) - 위경도 ↔ 격자좌표 변환
- ✅ WeatherAnalysisService (8 테스트) - 온도/습도 분류, 경계값 검증
- ✅ FoodScoringService (10 테스트) - 날씨 기반 음식 점수 계산
- ✅ FoodService (13 테스트) - 음식 추천 로직
- ✅ IntegratedScoringService (10 테스트) - 통합 점수 계산
- ✅ UserHistoryService (10 테스트) - 사용자 선호도 분석, 히스토리 관리
- ✅ FoodEvaluationService (10 테스트) - 음식 평가 통합 서비스

### 통합 테스트 (Integration Tests)
- ✅ Service Integration (7 테스트) - 서비스 간 연동

### E2E 테스트
- ✅ Food API E2E (5 테스트) - API 엔드포인트

**총 81개 테스트 케이스** (단위 69개 + 통합 7개 + E2E 5개)

## 💡 팁

- Bun이 Node.js보다 3~5배 빠릅니다
- 테스트 실패 시 에러 메시지를 명확하게 작성하세요
- 각 테스트는 독립적이어야 합니다 (서로 영향 없음)
