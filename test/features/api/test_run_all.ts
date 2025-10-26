import api from "../../../src/api";
import test_all_units from "../unit/test_all_units";
import test_all_integrations from "../integration/test_all_integrations";
import test_food_api from "../e2e/api/test_food_api";

/**
 * 모든 테스트 실행 (단위 + 통합 + E2E)
 * @description @nestia/e2e DynamicExecutor가 인식할 수 있도록 test/features/api/에 배치
 */
export default async function test_run_all(
  connection: api.IConnection,
): Promise<void> {
  console.log("\n");
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║                                                           ║");
  console.log("║         🚀 WRTN Dish - 전체 테스트 스위트              ║");
  console.log("║                                                           ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log("\n");

  const startTime = Date.now();

  // Phase 1: 단위 테스트
  console.log("📍 Phase 1: 단위 테스트");
  console.log("━".repeat(60));
  try {
    await test_all_units(connection);
    console.log(`✅ 단위 테스트 완료\n`);
  } catch (error: any) {
    console.error(`❌ 단위 테스트 실패: ${error.message}\n`);
    throw error;
  }

  // Phase 2: 통합 테스트
  console.log("📍 Phase 2: 통합 테스트");
  console.log("━".repeat(60));
  try {
    await test_all_integrations(connection);
    console.log(`✅ 통합 테스트 완료\n`);
  } catch (error: any) {
    console.error(`❌ 통합 테스트 실패: ${error.message}\n`);
    throw error;
  }

  // Phase 3: E2E 테스트
  console.log("📍 Phase 3: E2E 테스트");
  console.log("━".repeat(60));
  try {
    await test_food_api(connection);
    console.log(`✅ E2E 테스트 완료\n`);
  } catch (error: any) {
    console.error(`❌ E2E 테스트 실패: ${error.message}\n`);
    throw error;
  }

  // 최종 결과
  const totalDuration = (Date.now() - startTime) / 1000;
  console.log("\n");
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║                   🎉 테스트 완료!                         ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log(`\n⏱️  총 실행 시간: ${totalDuration.toFixed(2)}초`);
  console.log(`✅ 모든 테스트 통과!\n`);
}
