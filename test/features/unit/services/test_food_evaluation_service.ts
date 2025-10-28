import {
  IFoodEvaluationResponse,
  IWeatherConditions,
} from "../../../../src/api/structures/food/IFoodCategory";
import { FoodEvaluationService } from "../../../../src/services/FoodEvaluationService";
import { FoodScoringService } from "../../../../src/services/FoodScoringService";
import { WeatherAnalysisService } from "../../../../src/services/WeatherAnalysisService";
import { WeatherService } from "../../../../src/services/WeatherService";

/**
 * FoodEvaluationService 단위 테스트
 * @description 날씨 기반 음식 평가 통합 서비스 검증
 */
export default async function test_food_evaluation_service(): Promise<void> {
  console.log("=== FoodEvaluationService 단위 테스트 시작 ===\n");

  // 서비스 인스턴스 생성 (DI 없이 직접 생성)
  const weatherService = new WeatherService();
  const weatherAnalysisService = new WeatherAnalysisService();
  const foodScoringService = new FoodScoringService();

  const service = new FoodEvaluationService(
    weatherService,
    weatherAnalysisService,
    foodScoringService,
  );

  // ========================================
  // 테스트 1: calculateFoodScoresForWeather - 날씨 조건으로 점수 계산
  // ========================================
  console.log("테스트 1: 날씨 조건으로 음식 점수 계산");

  const hotHumidWeather: IWeatherConditions = {
    temperature: "hot",
    humidity: "high",
    actualTemperature: 32,
    actualHumidity: 80,
  };

  const topCategories = service.calculateFoodScoresForWeather(
    hotHumidWeather,
    3,
  );

  if (!Array.isArray(topCategories)) {
    throw new Error("calculateFoodScoresForWeather는 배열을 반환해야 함");
  }

  if (topCategories.length !== 3) {
    throw new Error(`상위 3개를 반환해야 함: got ${topCategories.length}개`);
  }

  console.log(`  ✓ 상위 3개 카테고리 반환 확인`);

  // 각 카테고리에 score와 rank가 있는지 확인
  for (const category of topCategories) {
    if (typeof category.score !== "number") {
      throw new Error(`${category.nameKo}의 score가 숫자가 아님`);
    }
    if (typeof category.rank !== "number") {
      throw new Error(`${category.nameKo}의 rank가 숫자가 아님`);
    }
  }

  console.log(
    `  ✓ 더운 날씨 추천: ${topCategories.map((c) => c.nameKo).join(", ")}\n`,
  );

  // ========================================
  // 테스트 2: topN 파라미터 변경
  // ========================================
  console.log("테스트 2: topN 파라미터 변경 테스트");

  const top5 = service.calculateFoodScoresForWeather(hotHumidWeather, 5);

  if (top5.length !== 5) {
    throw new Error(`상위 5개를 반환해야 함: got ${top5.length}개`);
  }

  console.log(`  ✓ topN=5: ${top5.map((c) => c.nameKo).join(", ")}`);

  const top1 = service.calculateFoodScoresForWeather(hotHumidWeather, 1);

  if (top1.length !== 1) {
    throw new Error(`상위 1개를 반환해야 함: got ${top1.length}개`);
  }

  console.log(`  ✓ topN=1: ${top1[0].nameKo}\n`);

  // ========================================
  // 테스트 3: 다양한 날씨 조건에 대한 점수 계산
  // ========================================
  console.log("테스트 3: 다양한 날씨 조건별 음식 추천");

  const weatherScenarios = [
    {
      name: "더운 여름날",
      conditions: {
        temperature: "hot" as const,
        humidity: "high" as const,
        actualTemperature: 35,
        actualHumidity: 85,
      },
    },
    {
      name: "추운 겨울날",
      conditions: {
        temperature: "cold" as const,
        humidity: "low" as const,
        actualTemperature: 5,
        actualHumidity: 30,
      },
    },
    {
      name: "온화한 봄날",
      conditions: {
        temperature: "moderate" as const,
        humidity: "moderate" as const,
        actualTemperature: 20,
        actualHumidity: 50,
      },
    },
  ];

  for (const scenario of weatherScenarios) {
    const recommended = service.calculateFoodScoresForWeather(
      scenario.conditions,
      3,
    );

    if (recommended.length !== 3) {
      throw new Error(
        `${scenario.name}에서 3개를 반환해야 함: got ${recommended.length}개`,
      );
    }

    console.log(
      `  ✓ ${scenario.name} (${scenario.conditions.temperature}, ${scenario.conditions.humidity}): ${recommended.map((c) => c.nameKo).join(", ")}`,
    );
  }

  console.log();

  // ========================================
  // 테스트 4: generateEvaluationSummary - 평가 요약 생성
  // ========================================
  console.log("테스트 4: 평가 결과 요약 텍스트 생성");

  const evaluationResult: IFoodEvaluationResponse = {
    location: { lat: 37.5665, lng: 126.978 },
    weather: {
      temperature: "hot",
      humidity: "high",
      actualTemperature: 32,
      actualHumidity: 80,
    },
    topCategories: topCategories,
    metadata: {
      evaluatedAt: new Date().toISOString(),
      totalCategoriesEvaluated: 20,
      weatherDataSuccess: true,
    },
  };

  const summary = service.generateEvaluationSummary(evaluationResult);

  if (typeof summary !== "string") {
    throw new Error("generateEvaluationSummary는 문자열을 반환해야 함");
  }

  if (summary.length === 0) {
    throw new Error("요약 텍스트가 비어있음");
  }

  // 요약에 날씨 정보가 포함되어 있는지 확인
  if (!summary.includes("날씨")) {
    throw new Error(`요약에 '날씨' 키워드 누락: ${summary}`);
  }

  // 온도와 습도 정보가 포함되어 있는지 확인
  if (!summary.includes("32") || !summary.includes("80")) {
    throw new Error(`요약에 실제 온도/습도 정보 누락: ${summary}`);
  }

  // 추천 음식이 포함되어 있는지 확인
  const firstFoodName = topCategories[0].nameKo;
  if (!summary.includes(firstFoodName)) {
    throw new Error(`요약에 추천 음식 '${firstFoodName}' 누락: ${summary}`);
  }

  console.log(`  ✓ 요약 텍스트: "${summary}"\n`);

  // ========================================
  // 테스트 5: null 값이 포함된 날씨 조건에 대한 요약
  // ========================================
  console.log("테스트 5: null 값 포함 날씨 조건 요약");

  const nullWeatherResult: IFoodEvaluationResponse = {
    location: { lat: 37.5665, lng: 126.978 },
    weather: {
      temperature: "moderate",
      humidity: "moderate",
      actualTemperature: null,
      actualHumidity: null,
    },
    topCategories: service.calculateFoodScoresForWeather(
      {
        temperature: "moderate",
        humidity: "moderate",
        actualTemperature: null,
        actualHumidity: null,
      },
      3,
    ),
    metadata: {
      evaluatedAt: new Date().toISOString(),
      totalCategoriesEvaluated: 20,
      weatherDataSuccess: false,
    },
  };

  const nullWeatherSummary =
    service.generateEvaluationSummary(nullWeatherResult);

  if (typeof nullWeatherSummary !== "string") {
    throw new Error("null 값 조건에서도 문자열을 반환해야 함");
  }

  if (nullWeatherSummary.length === 0) {
    throw new Error("null 값 조건에서도 요약 텍스트가 있어야 함");
  }

  console.log(`  ✓ null 값 요약: "${nullWeatherSummary}"\n`);

  // ========================================
  // 테스트 6: 점수 순서 검증
  // ========================================
  console.log("테스트 6: 반환된 카테고리의 점수 순서 검증");

  const scoredCategories = service.calculateFoodScoresForWeather(
    hotHumidWeather,
    10,
  );

  // 점수가 내림차순으로 정렬되어 있는지 확인
  for (let i = 0; i < scoredCategories.length - 1; i++) {
    if (scoredCategories[i].score < scoredCategories[i + 1].score) {
      throw new Error(
        `점수가 내림차순이 아님: ${scoredCategories[i].nameKo}(${scoredCategories[i].score}) < ${scoredCategories[i + 1].nameKo}(${scoredCategories[i + 1].score})`,
      );
    }
  }

  console.log(`  ✓ 상위 10개 카테고리가 점수 내림차순으로 정렬됨\n`);

  // ========================================
  // 테스트 7: rank 할당 검증
  // ========================================
  console.log("테스트 7: 카테고리별 rank 할당 검증");

  for (let i = 0; i < scoredCategories.length; i++) {
    const expectedRank = i + 1;
    if (scoredCategories[i].rank !== expectedRank) {
      throw new Error(
        `${scoredCategories[i].nameKo}의 rank 오류: expected ${expectedRank}, got ${scoredCategories[i].rank}`,
      );
    }
  }

  console.log(`  ✓ 모든 카테고리에 올바른 rank 할당됨 (1-${scoredCategories.length})\n`);

  // ========================================
  // 테스트 8: 모든 날씨 조건 조합 테스트
  // ========================================
  console.log("테스트 8: 모든 날씨 조건 조합 테스트");

  const temperatures = ["hot", "moderate", "cold"] as const;
  const humidities = ["high", "moderate", "low"] as const;

  let combinationCount = 0;

  for (const temp of temperatures) {
    for (const humidity of humidities) {
      const conditions: IWeatherConditions = {
        temperature: temp,
        humidity: humidity,
        actualTemperature: temp === "hot" ? 30 : temp === "cold" ? 10 : 20,
        actualHumidity: humidity === "high" ? 80 : humidity === "low" ? 30 : 50,
      };

      const result = service.calculateFoodScoresForWeather(conditions, 3);

      if (result.length !== 3) {
        throw new Error(
          `${temp}/${humidity} 조합에서 3개를 반환해야 함: got ${result.length}개`,
        );
      }

      combinationCount++;
    }
  }

  console.log(
    `  ✓ 모든 날씨 조건 조합 (${combinationCount}개) 테스트 통과\n`,
  );

  // ========================================
  // 테스트 9: 동일한 날씨 조건 반복 호출 일관성 검증
  // ========================================
  console.log("테스트 9: 동일한 조건 반복 호출 일관성");

  const testWeather: IWeatherConditions = {
    temperature: "hot",
    humidity: "high",
    actualTemperature: 30,
    actualHumidity: 75,
  };

  const result1 = service.calculateFoodScoresForWeather(testWeather, 5);
  const result2 = service.calculateFoodScoresForWeather(testWeather, 5);

  if (result1.length !== result2.length) {
    throw new Error("반복 호출 시 결과 개수가 다름");
  }

  for (let i = 0; i < result1.length; i++) {
    if (result1[i].nameKo !== result2[i].nameKo) {
      throw new Error(
        `반복 호출 시 순서가 다름: ${result1[i].nameKo} !== ${result2[i].nameKo}`,
      );
    }
    if (result1[i].score !== result2[i].score) {
      throw new Error(
        `반복 호출 시 점수가 다름: ${result1[i].nameKo} ${result1[i].score} !== ${result2[i].score}`,
      );
    }
  }

  console.log(`  ✓ 동일한 조건에서 일관된 결과 반환\n`);

  // ========================================
  // 테스트 10: 요약 텍스트 다국어 지원 확인
  // ========================================
  console.log("테스트 10: 요약 텍스트 한글 카테고리명 사용 확인");

  const koreanCategories = service.calculateFoodScoresForWeather(
    hotHumidWeather,
    3,
  );

  for (const category of koreanCategories) {
    if (!category.nameKo) {
      throw new Error(`카테고리에 한글명(nameKo)이 없음: ${category.name}`);
    }

    // 한글 문자가 포함되어 있는지 확인
    const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(category.nameKo);
    if (!hasKorean) {
      throw new Error(
        `nameKo에 한글이 포함되어야 함: ${category.nameKo} (${category.name})`,
      );
    }
  }

  console.log(`  ✓ 모든 카테고리에 한글명 존재 확인\n`);

  console.log("=== ✅ FoodEvaluationService 모든 테스트 통과 ===");
}
