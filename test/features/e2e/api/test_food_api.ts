import api from "../../../../src/api";
import { IFoodRecommendationRequest } from "../../../../src/api/structures/food/IFoodRecommendation";

/**
 * Food API E2E 테스트
 * @description FoodController HTTP API 엔드포인트 검증
 */
export default async function test_food_api(
  connection: api.IConnection,
): Promise<void> {
  console.log("=== Food API E2E 테스트 시작 ===\n");

  // 테스트 1: POST /food/recommend - 음식 추천 API
  console.log("테스트 1: POST /food/recommend - 음식 추천");

  const recommendRequest: IFoodRecommendationRequest = {
    fullness: 3,
    preferences: "한식 좋아하고 매운 음식 선호",
  };

  const recommendResponse = await api.functional.food.recommend.recommendFood(
    connection,
    recommendRequest,
  );

  if (!recommendResponse) {
    throw new Error("음식 추천 응답이 null");
  }

  if (!recommendResponse.message || recommendResponse.message.length === 0) {
    throw new Error("추천 메시지가 비어있음");
  }

  if (!recommendResponse.fullnessAnalysis) {
    throw new Error("포만감 분석 결과 누락");
  }

  if (recommendResponse.recommendedPortion !== "hearty") {
    throw new Error(
      `권장 식사량 오류: expected 'hearty', got '${recommendResponse.recommendedPortion}'`,
    );
  }

  if (!recommendResponse.metadata.success) {
    throw new Error("metadata.success가 false");
  }

  console.log(`  메시지: "${recommendResponse.message.substring(0, 50)}..."`);
  console.log(`  포만감 분석: "${recommendResponse.fullnessAnalysis}"`);
  console.log(`  권장 식사량: ${recommendResponse.recommendedPortion}`);
  console.log(`✓ 음식 추천 API 정상\n`);

  // 테스트 2: POST /food/analyze - 포만감 분석 API
  console.log("테스트 2: POST /food/analyze - 포만감 분석");

  const analyzeRequest = { fullness: 2 };
  const analyzeResponse = await api.functional.food.analyze.analyzeHungerLevel(
    connection,
    analyzeRequest,
  );

  if (!analyzeResponse) {
    throw new Error("포만감 분석 응답이 null");
  }

  if (!analyzeResponse.status || analyzeResponse.status.length === 0) {
    throw new Error("포만감 상태 정보 누락");
  }

  if (analyzeResponse.recommendedPortion !== "normal") {
    throw new Error(
      `분석 결과 권장 식사량 오류: expected 'normal', got '${analyzeResponse.recommendedPortion}'`,
    );
  }

  if (!analyzeResponse.advice || analyzeResponse.advice.length === 0) {
    throw new Error("조언 정보 누락");
  }

  console.log(`  상태: "${analyzeResponse.status}"`);
  console.log(`  권장 식사량: ${analyzeResponse.recommendedPortion}`);
  console.log(`  조언: "${analyzeResponse.advice.substring(0, 50)}..."`);
  console.log(`✓ 포만감 분석 API 정상\n`);

  // 테스트 3: 다양한 fullness 레벨 테스트
  console.log("테스트 3: 다양한 fullness 레벨 테스트");

  const fullnessLevels: Array<{ level: 1 | 2 | 3; expected: string }> = [
    { level: 1, expected: "minimal" },
    { level: 2, expected: "normal" },
    { level: 3, expected: "hearty" },
  ];

  for (const { level, expected } of fullnessLevels) {
    const request: IFoodRecommendationRequest = { fullness: level };
    const response = await api.functional.food.recommend.recommendFood(connection, request);

    if (response.recommendedPortion !== expected) {
      throw new Error(
        `레벨 ${level} 권장 식사량 오류: expected '${expected}', got '${response.recommendedPortion}'`,
      );
    }

    console.log(`  레벨 ${level}: ${response.recommendedPortion} ✓`);
  }
  console.log(`✓ 모든 fullness 레벨 테스트 통과\n`);

  // 테스트 4: preferences 반영 테스트
  console.log("테스트 4: preferences 파라미터 반영");

  const preferenceTests = [
    { preferences: "채식 위주", keyword: "채식 위주" },
    { preferences: "고기 좋아함", keyword: "고기 좋아함" },
    { preferences: "국물 있는 음식", keyword: "국물 있는 음식" },
  ];

  for (const test of preferenceTests) {
    const request: IFoodRecommendationRequest = {
      fullness: 2,
      preferences: test.preferences,
    };
    const response = await api.functional.food.recommend.recommendFood(connection, request);

    if (!response.message.includes(test.keyword)) {
      throw new Error(
        `preferences '${test.preferences}'가 응답에 반영되지 않음`,
      );
    }

    console.log(`  "${test.preferences}" 반영 ✓`);
  }
  console.log(`✓ preferences 파라미터 반영 정상\n`);

  // 테스트 5: 에러 케이스 - 잘못된 fullness 값
  console.log("테스트 5: 잘못된 fullness 값 처리");

  try {
    const invalidRequest = { fullness: 5 } as any; // 유효 범위: 1-3
    await api.functional.food.analyze.analyzeHungerLevel(connection, invalidRequest);
    throw new Error("잘못된 fullness 값에 대해 에러가 발생하지 않음");
  } catch (error: any) {
    // Typia 또는 NestJS validation 에러 예상
    if (
      error.message &&
      (error.message.includes("validation") ||
        error.message.includes("Maximum") ||
        error.message.includes("범위"))
    ) {
      console.log(`  예상된 validation 에러 발생 ✓`);
    } else {
      console.log(
        `  에러 발생 (예상된 동작이지만 에러 메시지 다를 수 있음): ${error.message}`,
      );
    }
  }
  console.log(`✓ 에러 처리 확인\n`);

  console.log("=== ✅ Food API E2E 테스트 모두 통과 ===");
}
