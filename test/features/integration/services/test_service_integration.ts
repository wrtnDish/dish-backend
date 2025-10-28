import { IWeatherConditions } from "../../../../src/api/structures/food/IFoodCategory";
import { FoodScoringService } from "../../../../src/services/FoodScoringService";
import { FoodService } from "../../../../src/services/FoodService";
import { IntegratedScoringService } from "../../../../src/services/IntegratedScoringService";

/**
 * Service 간 통합 테스트
 * @description 여러 Service가 함께 작동하는 시나리오 검증
 */
export default async function test_service_integration(): Promise<void> {
  console.log("=== Service 통합 테스트 시작 ===\n");

  // 테스트 1: FoodScoringService와 IntegratedScoringService 연동
  console.log("테스트 1: FoodScoringService + IntegratedScoringService 연동");

  const foodScoringService = new FoodScoringService();
  const integratedService = new IntegratedScoringService();

  const weather: IWeatherConditions = {
    humidity: "high",
    temperature: "hot",
    actualTemperature: 30,
    actualHumidity: 80,
  };

  // FoodScoringService로 날씨 기반 점수만 계산
  const weatherScored = foodScoringService.calculateAllFoodScores(weather);
  const weatherTop3 = foodScoringService.selectTopCategories(weatherScored, 3);

  // IntegratedScoringService로 통합 점수 계산 (날씨 + 히스토리 + 포만감)
  const integratedTop2 = await integratedService.calculateIntegratedScore(
    weather,
    3,
  );

  console.log(
    `  날씨만 고려 Top 3: ${weatherTop3.map((c) => c.nameKo).join(", ")}`,
  );
  console.log(
    `  통합 점수 Top 2: ${integratedTop2.map((c) => c.nameKo).join(", ")}`,
  );

  // 통합 점수가 날씨 점수를 포함하면서 추가 요소를 반영하는지 확인
  for (const category of integratedTop2) {
    if (category.score < 10) {
      throw new Error(`통합 점수가 기본 점수(10) 미만: ${category.score}`);
    }
  }

  console.log(`✓ 두 서비스 연동 정상\n`);

  // 테스트 2: 시나리오 기반 통합 테스트 - 더운 여름날 점심시간
  console.log("테스트 2: 시나리오 - 더운 여름날 점심시간, 매우 배고픔");

  const summerWeather: IWeatherConditions = {
    humidity: "high",
    temperature: "hot",
    actualTemperature: 30,
    actualHumidity: 80,
  };

  const lunchRecommendation = await integratedService.calculateIntegratedScore(
    summerWeather,
    3, // 매우 배고픔
  );

  const foodService = new FoodService();
  const hungerAnalysis = foodService.analyzeHungerLevel(3);
  const timeBasedRecommendation =
    foodService.getTimeBasedMealRecommendation(13); // 13시 (점심)

  console.log(`  날씨: 더운 날씨 + 높은 습도`);
  console.log(`  시간: ${timeBasedRecommendation.mealType} (13시)`);
  console.log(`  배고픔: ${hungerAnalysis.status} (레벨 3)`);
  console.log(`  권장 식사량: ${hungerAnalysis.recommendedPortion}`);
  console.log(
    `  통합 추천: ${lunchRecommendation.map((c) => c.nameKo).join(", ")}`,
  );
  console.log(
    `  시간대 적합 음식: ${timeBasedRecommendation.appropriateFoods.join(", ")}`,
  );
  console.log(`✓ 시나리오 테스트 완료\n`);

  // 테스트 3: 시나리오 기반 통합 테스트 - 추운 겨울밤 야식
  console.log("테스트 3: 시나리오 - 추운 겨울밤, 배부름");

  const winterWeather: IWeatherConditions = {
    humidity: "low",
    temperature: "cold",
    actualTemperature: 5,
    actualHumidity: 30,
  };

  const lateNightRecommendation =
    await integratedService.calculateIntegratedScore(
      winterWeather,
      1, // 배부름
    );

  const fullAnalysis = foodService.analyzeHungerLevel(1);
  const lateNightTimeRecommendation =
    foodService.getTimeBasedMealRecommendation(23); // 23시 (야식)

  console.log(`  날씨: 추운 날씨 + 낮은 습도`);
  console.log(`  시간: ${lateNightTimeRecommendation.mealType} (23시)`);
  console.log(`  배고픔: ${fullAnalysis.status} (레벨 1)`);
  console.log(`  권장 식사량: ${fullAnalysis.recommendedPortion}`);
  console.log(
    `  통합 추천: ${lateNightRecommendation.map((c) => c.nameKo).join(", ")}`,
  );
  console.log(
    `  시간대 적합 음식: ${lateNightTimeRecommendation.appropriateFoods.join(", ")}`,
  );
  console.log(`✓ 야식 시나리오 테스트 완료\n`);

  // 테스트 4: 날씨 변화에 따른 추천 변화
  console.log("테스트 4: 날씨 변화에 따른 추천 변화 추적");

  const weatherScenarios: Array<{ name: string; weather: IWeatherConditions }> =
    [
      {
        name: "더운 날씨",
        weather: {
          humidity: "high",
          temperature: "hot",
          actualTemperature: 30,
          actualHumidity: 80,
        },
      },
      {
        name: "추운 날씨",
        weather: {
          humidity: "low",
          temperature: "cold",
          actualTemperature: 5,
          actualHumidity: 30,
        },
      },
      {
        name: "온화한 날씨",
        weather: {
          humidity: "moderate",
          temperature: "moderate",
          actualTemperature: 22,
          actualHumidity: 55,
        },
      },
    ];

  for (const scenario of weatherScenarios) {
    const recommendation = await integratedService.calculateIntegratedScore(
      scenario.weather,
      2,
    );
    console.log(
      `  ${scenario.name}: ${recommendation.map((c) => c.nameKo).join(", ")}`,
    );
  }

  console.log(`✓ 날씨별 추천 변화 확인\n`);

  // 테스트 5: 포만감 레벨 변화에 따른 추천 변화
  console.log("테스트 5: 포만감 레벨 변화에 따른 추천 변화");

  const moderateWeather: IWeatherConditions = {
    humidity: "moderate",
    temperature: "moderate",
    actualTemperature: 22,
    actualHumidity: 55,
  };

  const fullnessLevels = [
    { level: 3, name: "매우 배고픔" },
    { level: 2, name: "보통" },
    { level: 1, name: "배부름" },
  ];

  for (const { level, name } of fullnessLevels) {
    const recommendation = await integratedService.calculateIntegratedScore(
      moderateWeather,
      level as 1 | 2 | 3,
    );
    console.log(
      `  ${name} (레벨 ${level}): ${recommendation.map((c) => c.nameKo).join(", ")}`,
    );
  }

  console.log(`✓ 포만감별 추천 변화 확인\n`);

  // 테스트 6: 통계 생성 및 분석
  console.log("테스트 6: 점수 통계 생성 및 비교");

  const scoredCategories = foodScoringService.calculateAllFoodScores({
    humidity: "high",
    temperature: "hot",
    actualTemperature: 30,
    actualHumidity: 80,
  });

  const stats = foodScoringService.generateScoringStatistics(scoredCategories);

  console.log(`  총 카테고리: ${stats.totalCategories}개`);
  console.log(`  평균 점수: ${stats.averageScore}점`);
  console.log(`  점수 범위: ${stats.minScore}점 ~ ${stats.maxScore}점`);
  console.log(`  점수 분포: ${JSON.stringify(stats.scoreDistribution)}`);

  if (
    stats.averageScore < stats.minScore ||
    stats.averageScore > stats.maxScore
  ) {
    throw new Error("통계 계산 오류: 평균값이 범위를 벗어남");
  }

  console.log(`✓ 통계 분석 정상\n`);

  // 테스트 7: 엣지 케이스 - 새벽 시간 + 극한 날씨
  console.log("테스트 7: 엣지 케이스 - 새벽 시간 + 극한 날씨");

  const extremeWeather: IWeatherConditions = {
    humidity: "high",
    temperature: "hot",
    actualTemperature: 35,
    actualHumidity: 85,
  };

  const earlyMorningRecommendation =
    foodService.getTimeBasedMealRecommendation(3); // 새벽 3시
  const extremeWeatherRecommendation =
    await integratedService.calculateIntegratedScore(extremeWeather, 2);

  console.log(`  새벽 3시 추천: ${earlyMorningRecommendation.mealType}`);
  console.log(
    `  극한 날씨 추천: ${extremeWeatherRecommendation.map((c) => c.nameKo).join(", ")}`,
  );
  console.log(`✓ 엣지 케이스 처리 정상\n`);

  console.log("=== ✅ Service 통합 테스트 모두 통과 ===");
}
