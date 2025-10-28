import { IFoodRecommendationRequest } from "../../../../src/api/structures/food/IFoodRecommendation";
import { FoodService } from "../../../../src/services/FoodService";

/**
 * FoodService 단위 테스트
 * @description 음식 추천 비즈니스 로직 검증
 */
export default async function test_food_service(): Promise<void> {
  console.log("=== FoodService 단위 테스트 시작 ===\n");

  const service = new FoodService();

  // 테스트 1: 매우 배고픔 (fullness: 3) - hearty portion
  console.log("테스트 1: 매우 배고픔 상태 분석");
  const veryHungryRequest: IFoodRecommendationRequest = {
    fullness: 3,
    preferences: "한식 좋아해",
  };

  const veryHungryResponse = await service.recommendFood(veryHungryRequest);

  if (veryHungryResponse.recommendedPortion !== "hearty") {
    throw new Error(
      `매우 배고픔 상태의 권장 식사량 오류: expected 'hearty', got '${veryHungryResponse.recommendedPortion}'`,
    );
  }

  if (!veryHungryResponse.message.includes("든든한")) {
    throw new Error(
      `메시지에 '든든한' 키워드 누락: ${veryHungryResponse.message}`,
    );
  }

  if (!veryHungryResponse.metadata.success) {
    throw new Error("metadata.success가 false");
  }

  console.log(
    `✓ 매우 배고픔: ${veryHungryResponse.recommendedPortion}, "${veryHungryResponse.fullnessAnalysis}"\n`,
  );

  // 테스트 2: 보통 (fullness: 2) - normal portion
  console.log("테스트 2: 보통 상태 분석");
  const normalRequest: IFoodRecommendationRequest = {
    fullness: 2,
  };

  const normalResponse = await service.recommendFood(normalRequest);

  if (normalResponse.recommendedPortion !== "normal") {
    throw new Error(
      `보통 상태의 권장 식사량 오류: expected 'normal', got '${normalResponse.recommendedPortion}'`,
    );
  }

  if (!normalResponse.message.includes("적당한")) {
    throw new Error(`메시지에 '적당한' 키워드 누락: ${normalResponse.message}`);
  }

  console.log(
    `✓ 보통 상태: ${normalResponse.recommendedPortion}, "${normalResponse.fullnessAnalysis}"\n`,
  );

  // 테스트 3: 배부름 (fullness: 1) - minimal portion
  console.log("테스트 3: 배부름 상태 분석");
  const fullRequest: IFoodRecommendationRequest = {
    fullness: 1,
  };

  const fullResponse = await service.recommendFood(fullRequest);

  if (fullResponse.recommendedPortion !== "minimal") {
    throw new Error(
      `배부름 상태의 권장 식사량 오류: expected 'minimal', got '${fullResponse.recommendedPortion}'`,
    );
  }

  if (!fullResponse.message.includes("드시지 않는")) {
    throw new Error(`메시지에 적절한 조언 누락: ${fullResponse.message}`);
  }

  console.log(
    `✓ 배부름 상태: ${fullResponse.recommendedPortion}, "${fullResponse.fullnessAnalysis}"\n`,
  );

  // 테스트 4: analyzeHungerLevel 메서드 테스트
  console.log("테스트 4: analyzeHungerLevel 직접 호출");
  const hungerAnalysis1 = service.analyzeHungerLevel(3);
  const hungerAnalysis2 = service.analyzeHungerLevel(2);
  const hungerAnalysis3 = service.analyzeHungerLevel(1);

  if (hungerAnalysis1.recommendedPortion !== "hearty") {
    throw new Error("analyzeHungerLevel(3) 오류");
  }

  if (hungerAnalysis2.recommendedPortion !== "normal") {
    throw new Error("analyzeHungerLevel(2) 오류");
  }

  if (hungerAnalysis3.recommendedPortion !== "minimal") {
    throw new Error("analyzeHungerLevel(1) 오류");
  }

  console.log(`✓ analyzeHungerLevel: 모든 레벨 정상 작동\n`);

  // 테스트 5: 시간대별 추천 - 아침 (6-10시)
  console.log("테스트 5: 시간대별 식사 추천 - 아침");
  const breakfastRecommendation = service.getTimeBasedMealRecommendation(8);

  if (breakfastRecommendation.mealType !== "아침식사") {
    throw new Error(
      `아침 시간대 식사 유형 오류: ${breakfastRecommendation.mealType}`,
    );
  }

  if (
    !breakfastRecommendation.appropriateFoods ||
    breakfastRecommendation.appropriateFoods.length === 0
  ) {
    throw new Error("아침 적합 음식 목록이 비어있음");
  }

  console.log(
    `✓ 아침 (8시): ${breakfastRecommendation.mealType} - ${breakfastRecommendation.appropriateFoods.join(", ")}\n`,
  );

  // 테스트 6: 시간대별 추천 - 점심 (12-15시)
  console.log("테스트 6: 시간대별 식사 추천 - 점심");
  const lunchRecommendation = service.getTimeBasedMealRecommendation(13);

  if (lunchRecommendation.mealType !== "점심식사") {
    throw new Error(
      `점심 시간대 식사 유형 오류: ${lunchRecommendation.mealType}`,
    );
  }

  console.log(
    `✓ 점심 (13시): ${lunchRecommendation.mealType} - ${lunchRecommendation.appropriateFoods.join(", ")}\n`,
  );

  // 테스트 7: 시간대별 추천 - 저녁 (18-22시)
  console.log("테스트 7: 시간대별 식사 추천 - 저녁");
  const dinnerRecommendation = service.getTimeBasedMealRecommendation(19);

  if (dinnerRecommendation.mealType !== "저녁식사") {
    throw new Error(
      `저녁 시간대 식사 유형 오류: ${dinnerRecommendation.mealType}`,
    );
  }

  console.log(
    `✓ 저녁 (19시): ${dinnerRecommendation.mealType} - ${dinnerRecommendation.appropriateFoods.join(", ")}\n`,
  );

  // 테스트 8: 시간대별 추천 - 야식 (22시 이후)
  console.log("테스트 8: 시간대별 식사 추천 - 야식");
  const lateNightRecommendation = service.getTimeBasedMealRecommendation(23);

  if (lateNightRecommendation.mealType !== "야식") {
    throw new Error(
      `야식 시간대 식사 유형 오류: ${lateNightRecommendation.mealType}`,
    );
  }

  console.log(
    `✓ 야식 (23시): ${lateNightRecommendation.mealType} - ${lateNightRecommendation.appropriateFoods.join(", ")}\n`,
  );

  // 테스트 9: 시간대별 추천 - 브런치 (10-12시)
  console.log("테스트 9: 시간대별 식사 추천 - 브런치");
  const brunchRecommendation = service.getTimeBasedMealRecommendation(11);

  if (brunchRecommendation.mealType !== "브런치") {
    throw new Error(
      `브런치 시간대 식사 유형 오류: ${brunchRecommendation.mealType}`,
    );
  }

  console.log(
    `✓ 브런치 (11시): ${brunchRecommendation.mealType} - ${brunchRecommendation.appropriateFoods.join(", ")}\n`,
  );

  // 테스트 10: 시간대별 추천 - 간식 (15-18시)
  console.log("테스트 10: 시간대별 식사 추천 - 간식");
  const snackRecommendation = service.getTimeBasedMealRecommendation(16);

  if (snackRecommendation.mealType !== "간식시간") {
    throw new Error(
      `간식 시간대 식사 유형 오류: ${snackRecommendation.mealType}`,
    );
  }

  console.log(
    `✓ 간식 (16시): ${snackRecommendation.mealType} - ${snackRecommendation.appropriateFoods.join(", ")}\n`,
  );

  // 테스트 11: 모든 시간대 (0-23시) 테스트
  console.log("테스트 11: 24시간 전체 시간대 테스트");
  for (let hour = 0; hour < 24; hour++) {
    const recommendation = service.getTimeBasedMealRecommendation(hour);

    if (!recommendation.mealType || recommendation.mealType.length === 0) {
      throw new Error(`${hour}시 mealType 누락`);
    }

    if (
      !recommendation.recommendation ||
      recommendation.recommendation.length === 0
    ) {
      throw new Error(`${hour}시 recommendation 누락`);
    }

    if (
      !recommendation.appropriateFoods ||
      recommendation.appropriateFoods.length === 0
    ) {
      throw new Error(`${hour}시 appropriateFoods 누락`);
    }
  }
  console.log(`✓ 24시간 모든 시간대 추천 정상\n`);

  // 테스트 12: metadata 검증
  console.log("테스트 12: 응답 metadata 검증");
  const testRequest: IFoodRecommendationRequest = { fullness: 2 };
  const testResponse = await service.recommendFood(testRequest);

  if (!testResponse.metadata) {
    throw new Error("metadata 누락");
  }

  if (!testResponse.metadata.timestamp) {
    throw new Error("timestamp 누락");
  }

  if (testResponse.metadata.fullnessLevel !== 2) {
    throw new Error(
      `fullnessLevel 오류: ${testResponse.metadata.fullnessLevel}`,
    );
  }

  // timestamp가 ISO 형식인지 확인
  const timestamp = new Date(testResponse.metadata.timestamp);
  if (isNaN(timestamp.getTime())) {
    throw new Error(
      `잘못된 timestamp 형식: ${testResponse.metadata.timestamp}`,
    );
  }

  console.log(
    `✓ metadata: success=${testResponse.metadata.success}, timestamp=${testResponse.metadata.timestamp}\n`,
  );

  // 테스트 13: preferences 반영 확인
  console.log("테스트 13: 사용자 선호도(preferences) 반영");
  const preferenceRequest: IFoodRecommendationRequest = {
    fullness: 3,
    preferences: "채식 위주",
  };

  const preferenceResponse = await service.recommendFood(preferenceRequest);

  if (!preferenceResponse.message.includes("채식 위주")) {
    throw new Error(
      `preferences가 메시지에 반영되지 않음: ${preferenceResponse.message}`,
    );
  }

  console.log(`✓ preferences 반영: "${preferenceResponse.message}"\n`);

  console.log("=== ✅ FoodService 모든 테스트 통과 ===");
}
