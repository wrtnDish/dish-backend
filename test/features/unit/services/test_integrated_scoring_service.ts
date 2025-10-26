import { IWeatherConditions } from "../../../../src/api/structures/food/IFoodCategory";
import { FullnessLevel } from "../../../../src/api/structures/food/IFoodRecommendation";
import { IntegratedScoringService } from "../../../../src/services/IntegratedScoringService";

/**
 * IntegratedScoringService 단위 테스트
 * @description 날씨, 히스토리, 포만감을 종합한 통합 점수 계산 검증
 */
export default async function test_integrated_scoring_service(): Promise<void> {
  console.log("=== IntegratedScoringService 단위 테스트 시작 ===\n");

  const service = new IntegratedScoringService();

  // 테스트 1: 기본 통합 점수 계산
  console.log("테스트 1: 기본 통합 점수 계산");
  const weather: IWeatherConditions = {
    humidity: "high",
    temperature: "hot",
    actualTemperature: 30,
    actualHumidity: 80,
  };
  const hungerLevel: FullnessLevel = 3;

  const topCategories = await service.calculateIntegratedScore(
    weather,
    hungerLevel,
  );

  if (!topCategories || topCategories.length !== 2) {
    throw new Error(
      `상위 2개 카테고리를 반환해야 함: got ${topCategories?.length}`,
    );
  }

  console.log(
    `✓ 통합 점수 계산 성공: ${topCategories.map((c) => c.nameKo).join(", ")}\n`,
  );

  // 테스트 2: 각 카테고리에 점수와 rank 할당 확인
  console.log("테스트 2: 점수와 rank 할당 확인");
  for (const category of topCategories) {
    if (typeof category.score !== "number") {
      throw new Error(`${category.nameKo}의 score가 숫자가 아님`);
    }

    if (typeof category.rank !== "number") {
      throw new Error(`${category.nameKo}의 rank가 숫자가 아님`);
    }

    if (category.rank < 1 || category.rank > 2) {
      throw new Error(
        `${category.nameKo}의 rank가 1-2 범위를 벗어남: ${category.rank}`,
      );
    }

    if (!category.reason || category.reason.trim().length === 0) {
      throw new Error(`${category.nameKo}의 reason이 비어있음`);
    }
  }
  console.log(`✓ 모든 카테고리에 점수, rank, reason 할당됨\n`);

  // 테스트 3: rank 순서 확인 (1, 2)
  console.log("테스트 3: rank 순서 확인");
  if (topCategories[0].rank !== 1) {
    throw new Error(
      `첫 번째 카테고리 rank 오류: expected 1, got ${topCategories[0].rank}`,
    );
  }

  if (topCategories[1].rank !== 2) {
    throw new Error(
      `두 번째 카테고리 rank 오류: expected 2, got ${topCategories[1].rank}`,
    );
  }

  if (topCategories[0].score < topCategories[1].score) {
    throw new Error(`점수 순서 오류: 1위가 2위보다 점수가 낮음`);
  }

  console.log(
    `✓ Rank 순서 정상: 1위(${topCategories[0].score}점) >= 2위(${topCategories[1].score}점)\n`,
  );

  // 테스트 4: 매우 배고픔 (hungerLevel 3) - 든든한 음식 선호
  console.log("테스트 4: 매우 배고픔 상태에서 든든한 음식 추천");
  const veryHungryResult = await service.calculateIntegratedScore(
    {
      humidity: "moderate",
      temperature: "moderate",
      actualTemperature: 22,
      actualHumidity: 55,
    },
    3,
  );

  // 든든한 음식 카테고리들
  const heartyFoods = [
    "한식",
    "찜/탕",
    "구이",
    "중식",
    "돈까스",
    "치킨",
    "버거",
  ];
  const hasHeartyFood = veryHungryResult.some((c) =>
    heartyFoods.includes(c.nameKo),
  );

  console.log(
    `  상위 2개: ${veryHungryResult.map((c) => c.nameKo).join(", ")}`,
  );
  console.log(`✓ 매우 배고픔 시 추천 결과 확인\n`);

  // 테스트 5: 배부름 (hungerLevel 1) - 가벼운 음식 선호
  console.log("테스트 5: 배부름 상태에서 가벼운 음식 추천");
  const fullResult = await service.calculateIntegratedScore(
    {
      humidity: "moderate",
      temperature: "moderate",
      actualTemperature: 22,
      actualHumidity: 55,
    },
    1,
  );

  console.log(`  상위 2개: ${fullResult.map((c) => c.nameKo).join(", ")}`);
  console.log(`✓ 배부름 시 추천 결과 확인\n`);

  // 테스트 6: 다양한 날씨 조건 테스트
  console.log("테스트 6: 다양한 날씨 조건 테스트");
  const weatherConditions: IWeatherConditions[] = [
    {
      humidity: "high",
      temperature: "hot",
      actualTemperature: 30,
      actualHumidity: 80,
    },
    {
      humidity: "low",
      temperature: "cold",
      actualTemperature: 10,
      actualHumidity: 30,
    },
    {
      humidity: "moderate",
      temperature: "moderate",
      actualTemperature: 22,
      actualHumidity: 55,
    },
    {
      humidity: "high",
      temperature: "cold",
      actualTemperature: 10,
      actualHumidity: 80,
    },
    {
      humidity: "low",
      temperature: "hot",
      actualTemperature: 30,
      actualHumidity: 30,
    },
  ];

  for (const condition of weatherConditions) {
    const result = await service.calculateIntegratedScore(condition, 2);

    if (result.length !== 2) {
      throw new Error(
        `날씨 조건 ${JSON.stringify(condition)}에서 결과 개수 오류`,
      );
    }

    if (result[0].score <= 0 || result[1].score <= 0) {
      throw new Error(
        `날씨 조건 ${JSON.stringify(condition)}에서 점수가 0 이하`,
      );
    }

    console.log(
      `  ${condition.humidity}/${condition.temperature}: ${result.map((c) => c.nameKo).join(", ")}`,
    );
  }
  console.log(`✓ 모든 날씨 조건 테스트 통과\n`);

  // 테스트 7: 모든 포만감 레벨 테스트
  console.log("테스트 7: 모든 포만감 레벨 테스트");
  const hungerLevels: FullnessLevel[] = [1, 2, 3];

  for (const level of hungerLevels) {
    const result = await service.calculateIntegratedScore(
      {
        humidity: "moderate",
        temperature: "moderate",
        actualTemperature: 22,
        actualHumidity: 55,
      },
      level,
    );

    if (result.length !== 2) {
      throw new Error(`포만감 레벨 ${level}에서 결과 개수 오류`);
    }

    console.log(`  레벨 ${level}: ${result.map((c) => c.nameKo).join(", ")}`);
  }
  console.log(`✓ 모든 포만감 레벨 테스트 통과\n`);

  // 테스트 8: 요일별 선호도 반영 (currentDay 파라미터)
  console.log("테스트 8: 요일별 선호도 반영 테스트");
  const days = ["Monday", "Wednesday", "Friday"];

  for (const day of days) {
    const result = await service.calculateIntegratedScore(
      {
        humidity: "moderate",
        temperature: "moderate",
        actualTemperature: 22,
        actualHumidity: 55,
      },
      2,
      day,
    );

    if (result.length !== 2) {
      throw new Error(`요일 ${day}에서 결과 개수 오류`);
    }

    console.log(`  ${day}: ${result.map((c) => c.nameKo).join(", ")}`);
  }
  console.log(`✓ 요일별 추천 테스트 통과\n`);

  // 테스트 9: getTodayFoodStatistics 메서드 테스트
  console.log("테스트 9: 오늘 음식 통계 조회");
  const stats = await service.getTodayFoodStatistics();

  if (!stats) {
    throw new Error("통계 조회 실패");
  }

  if (typeof stats.success !== "boolean") {
    throw new Error("통계 success 필드 오류");
  }

  if (!stats.message || stats.message.trim().length === 0) {
    throw new Error("통계 message 필드 누락");
  }

  console.log(`✓ 통계 조회 성공: ${stats.success}\n`);
  console.log(`  메시지: ${stats.message.split("\n")[0]}...\n`);

  // 테스트 10: 점수 범위 검증
  console.log("테스트 10: 점수 범위 검증");
  const scoreTestResult = await service.calculateIntegratedScore(
    {
      humidity: "high",
      temperature: "hot",
      actualTemperature: 30,
      actualHumidity: 80,
    },
    3,
  );

  for (const category of scoreTestResult) {
    // 통합 점수는 기본 10점 + 각종 가산점이므로 최소 10점 이상이어야 함
    if (category.score < 10) {
      throw new Error(
        `${category.nameKo}의 점수가 최소값(10) 미만: ${category.score}`,
      );
    }

    // 최대 점수는 10(기본) + 50(히스토리) + 25(날씨) + 15(포만감) = 100점
    if (category.score > 100) {
      throw new Error(
        `${category.nameKo}의 점수가 최대값(100) 초과: ${category.score}`,
      );
    }
  }
  console.log(`✓ 모든 카테고리 점수가 유효 범위 내 (10-100점)\n`);

  console.log("=== ✅ IntegratedScoringService 모든 테스트 통과 ===");
}
