/**
 * 모든 단위 테스트 실행
 * @description 개별 단위 테스트를 순차적으로 실행합니다
 */
import api from "../../../src/api";
import test_food_evaluation_service from "./services/test_food_evaluation_service";
import test_food_scoring_service from "./services/test_food_scoring_service";
import test_food_service from "./services/test_food_service";
import test_integrated_scoring_service from "./services/test_integrated_scoring_service";
import test_user_history_service from "./services/test_user_history_service";
import test_weather_analysis_service from "./services/test_weather_analysis_service";
import test_coordinate_util from "./utils/test_coordinate_util";

export default async function test_all_units(
  connection: api.IConnection,
): Promise<void> {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log(
    "║                 🧪 단위 테스트 전체 실행 시작                    ║",
  );
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n");

  const tests = [
    { name: "CoordinateUtil", fn: test_coordinate_util },
    { name: "WeatherAnalysisService", fn: test_weather_analysis_service },
    { name: "FoodScoringService", fn: test_food_scoring_service },
    { name: "FoodService", fn: test_food_service },
    { name: "IntegratedScoringService", fn: test_integrated_scoring_service },
    { name: "UserHistoryService", fn: test_user_history_service },
    { name: "FoodEvaluationService", fn: test_food_evaluation_service },
  ];

  let passed = 0;
  let failed = 0;
  const results: Array<{ name: string; status: "✅" | "❌"; error?: string }> =
    [];

  for (const test of tests) {
    try {
      console.log(`\n🔹 ${test.name} 테스트 실행 중...\n`);
      await test.fn();
      passed++;
      results.push({ name: test.name, status: "✅" });
    } catch (error: any) {
      failed++;
      results.push({
        name: test.name,
        status: "❌",
        error: error.message || String(error),
      });
      console.error(`\n❌ ${test.name} 테스트 실패:`, error.message);
    }
  }

  // 결과 요약
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                   📊 테스트 결과 요약                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n");

  for (const result of results) {
    console.log(`${result.status} ${result.name}`);
    if (result.error) {
      console.log(`   └─ ${result.error}`);
    }
  }

  console.log("\n");
  console.log(`총 ${tests.length}개 테스트 중:`);
  console.log(`  ✅ 성공: ${passed}개`);
  console.log(`  ❌ 실패: ${failed}개`);
  console.log(`  📈 성공률: ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log("\n");

  if (failed > 0) {
    throw new Error(`${failed}개의 단위 테스트가 실패했습니다`);
  }
}
