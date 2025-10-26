import {
  IScoredFoodCategory,
  IWeatherConditions,
} from "../../../../src/api/structures/food/IFoodCategory";
import { FoodScoringService } from "../../../../src/services/FoodScoringService";

/**
 * FoodScoringService 단위 테스트
 * @description 날씨 조건에 따른 음식 점수 계산 로직 검증
 */
export default async function test_food_scoring_service(): Promise<void> {
  console.log("=== FoodScoringService 단위 테스트 시작 ===\n");

  const service = new FoodScoringService();

  // 테스트 1: 높은 습도 + 차가운 음식 = 높은 점수
  console.log("테스트 1: 높은 습도에서 차가운 음식 점수");
  const highHumidityCondition: IWeatherConditions = {
    humidity: "high",
    temperature: "hot",
    actualTemperature: 30,
    actualHumidity: 80,
  };

  const scoredInHighHumidity = service.calculateAllFoodScores(
    highHumidityCondition,
  );
  const coldFoodInHighHumidity = scoredInHighHumidity.find(
    (c) => c.serveTemp === "cold",
  );

  if (!coldFoodInHighHumidity) {
    throw new Error("차가운 음식을 찾을 수 없음");
  }

  if (coldFoodInHighHumidity.score !== 3) {
    throw new Error(
      `높은 습도에서 차가운 음식 점수 오류: expected 3, got ${coldFoodInHighHumidity.score}`,
    );
  }
  console.log(`✓ 높은 습도 + 차가운 음식: ${coldFoodInHighHumidity.score}점\n`);

  // 테스트 2: 낮은 습도 + 뜨거운 음식 = 높은 점수
  console.log("테스트 2: 낮은 습도에서 뜨거운 음식 점수");
  const lowHumidityCondition: IWeatherConditions = {
    humidity: "low",
    temperature: "cold",
    actualTemperature: 10,
    actualHumidity: 30,
  };

  const scoredInLowHumidity =
    service.calculateAllFoodScores(lowHumidityCondition);
  const hotFoodInLowHumidity = scoredInLowHumidity.find(
    (c) => c.serveTemp === "hot",
  );

  if (!hotFoodInLowHumidity) {
    throw new Error("뜨거운 음식을 찾을 수 없음");
  }

  if (hotFoodInLowHumidity.score !== 3) {
    throw new Error(
      `낮은 습도에서 뜨거운 음식 점수 오류: expected 3, got ${hotFoodInLowHumidity.score}`,
    );
  }
  console.log(`✓ 낮은 습도 + 뜨거운 음식: ${hotFoodInLowHumidity.score}점\n`);

  // 테스트 3: 보통 습도 + 따뜻한 음식 = 높은 점수
  console.log("테스트 3: 보통 습도에서 따뜻한 음식 점수");
  const moderateHumidityCondition: IWeatherConditions = {
    humidity: "moderate",
    temperature: "moderate",
    actualTemperature: 22,
    actualHumidity: 55,
  };

  const scoredInModerateHumidity = service.calculateAllFoodScores(
    moderateHumidityCondition,
  );
  const warmFoodInModerateHumidity = scoredInModerateHumidity.find(
    (c) => c.serveTemp === "warm",
  );

  if (!warmFoodInModerateHumidity) {
    throw new Error("따뜻한 음식을 찾을 수 없음");
  }

  if (warmFoodInModerateHumidity.score !== 3) {
    throw new Error(
      `보통 습도에서 따뜻한 음식 점수 오류: expected 3, got ${warmFoodInModerateHumidity.score}`,
    );
  }
  console.log(
    `✓ 보통 습도 + 따뜻한 음식: ${warmFoodInModerateHumidity.score}점\n`,
  );

  // 테스트 4: 정렬 순서 검증 (점수 내림차순, ID 오름차순)
  console.log("테스트 4: 점수 정렬 순서 검증");
  for (let i = 0; i < scoredInHighHumidity.length - 1; i++) {
    const current = scoredInHighHumidity[i];
    const next = scoredInHighHumidity[i + 1];

    // 점수가 내림차순인지 확인
    if (current.score < next.score) {
      throw new Error(
        `정렬 오류: ${current.nameKo}(${current.score}점)이 ${next.nameKo}(${next.score}점)보다 앞에 와야 함`,
      );
    }

    // 동점인 경우 ID 오름차순 확인
    if (current.score === next.score && current.id > next.id) {
      throw new Error(
        `동점 처리 오류: ID ${current.id}가 ID ${next.id}보다 앞에 와야 함`,
      );
    }
  }
  console.log(`✓ 정렬 순서 정상: 점수 내림차순, 동점 시 ID 오름차순\n`);

  // 테스트 5: Rank 할당 검증
  console.log("테스트 5: Rank 할당 검증");
  scoredInHighHumidity.forEach((category, index) => {
    const expectedRank = index + 1;
    if (category.rank !== expectedRank) {
      throw new Error(
        `Rank 오류: ${category.nameKo}의 rank가 ${expectedRank}여야 하는데 ${category.rank}임`,
      );
    }
  });
  console.log(`✓ Rank 정상 할당: 1 ~ ${scoredInHighHumidity.length}\n`);

  // 테스트 6: Top N 선택 기능
  console.log("테스트 6: Top N 선택 기능");
  const top3 = service.selectTopCategories(scoredInHighHumidity, 3);

  if (top3.length !== 3) {
    throw new Error(`Top 3 선택 오류: expected 3, got ${top3.length}`);
  }

  // Top 3가 정확히 상위 3개인지 확인
  for (let i = 0; i < 3; i++) {
    if (top3[i].id !== scoredInHighHumidity[i].id) {
      throw new Error(`Top ${i + 1} 선택 오류`);
    }
  }
  console.log(`✓ Top 3 선택: ${top3.map((c) => c.nameKo).join(", ")}\n`);

  // 테스트 7: 통계 생성 기능
  console.log("테스트 7: 통계 생성 기능");
  const stats = service.generateScoringStatistics(scoredInHighHumidity);

  if (stats.totalCategories !== scoredInHighHumidity.length) {
    throw new Error(
      `총 카테고리 수 오류: expected ${scoredInHighHumidity.length}, got ${stats.totalCategories}`,
    );
  }

  if (stats.maxScore < stats.minScore) {
    throw new Error(
      `최대/최소 점수 오류: max(${stats.maxScore}) < min(${stats.minScore})`,
    );
  }

  if (
    stats.averageScore < stats.minScore ||
    stats.averageScore > stats.maxScore
  ) {
    throw new Error(
      `평균 점수 범위 오류: ${stats.averageScore} not in [${stats.minScore}, ${stats.maxScore}]`,
    );
  }

  // 점수 분포 검증
  let distributionTotal = 0;
  for (const count of Object.values(stats.scoreDistribution)) {
    distributionTotal += count;
  }

  if (distributionTotal !== stats.totalCategories) {
    throw new Error(
      `점수 분포 합계 오류: ${distributionTotal} !== ${stats.totalCategories}`,
    );
  }

  console.log(
    `✓ 통계 정상: 총 ${stats.totalCategories}개, 평균 ${stats.averageScore}점, 범위 [${stats.minScore}, ${stats.maxScore}]\n`,
  );

  // 테스트 8: warm & cold 복합 온도 처리
  console.log("테스트 8: 'warm & cold' 복합 온도 처리");
  const mixedTempCategory = scoredInHighHumidity.find(
    (c) => c.serveTemp === "warm & cold",
  );

  if (mixedTempCategory) {
    // 높은 습도에서는 cold(3점) > warm(2점)이므로 3점을 선택해야 함
    if (mixedTempCategory.score !== 3) {
      throw new Error(
        `복합 온도 점수 오류: expected 3, got ${mixedTempCategory.score}`,
      );
    }
    console.log(
      `✓ 복합 온도 처리: ${mixedTempCategory.nameKo} - ${mixedTempCategory.score}점 (cold/warm 중 최대값)\n`,
    );
  } else {
    console.log(`  (복합 온도 카테고리 없음)\n`);
  }

  // 테스트 9: 모든 습도 조건 테스트
  console.log("테스트 9: 모든 습도 조건에서 점수 계산");
  const humidityConditions: Array<"high" | "moderate" | "low"> = [
    "high",
    "moderate",
    "low",
  ];

  for (const humidity of humidityConditions) {
    const condition: IWeatherConditions = {
      humidity,
      temperature: "moderate",
      actualTemperature: 22,
      actualHumidity: humidity === "high" ? 75 : humidity === "low" ? 35 : 55,
    };
    const scored = service.calculateAllFoodScores(condition);

    if (scored.length === 0) {
      throw new Error(`${humidity} 습도에서 점수 계산 실패`);
    }

    // 모든 항목이 점수를 가지고 있는지 확인
    for (const category of scored) {
      if (
        typeof category.score !== "number" ||
        category.score < 1 ||
        category.score > 3
      ) {
        throw new Error(
          `${humidity} 습도에서 ${category.nameKo}의 점수 이상: ${category.score}`,
        );
      }
    }

    console.log(
      `  ${humidity} 습도: ${scored.length}개 카테고리 점수 계산 완료`,
    );
  }
  console.log(`✓ 모든 습도 조건 테스트 통과\n`);

  // 테스트 10: reason 필드 검증
  console.log("테스트 10: 점수 산출 근거(reason) 검증");
  for (const category of scoredInHighHumidity.slice(0, 5)) {
    if (!category.reason || category.reason.trim().length === 0) {
      throw new Error(`${category.nameKo}의 reason이 비어있음`);
    }

    // reason에 습도 정보가 포함되어 있는지 확인
    if (!category.reason.includes("습도")) {
      throw new Error(
        `${category.nameKo}의 reason에 습도 정보 누락: ${category.reason}`,
      );
    }
  }
  console.log(`✓ 모든 카테고리에 점수 산출 근거 포함\n`);

  console.log("=== ✅ FoodScoringService 모든 테스트 통과 ===");
}
