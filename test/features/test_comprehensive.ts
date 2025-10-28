/**
 * 포괄적 테스트 실행
 * @description 단위 테스트 → 통합 테스트 → E2E 테스트 순서로 전체 실행
 */
import api from "../../src/api";
import test_food_api from "./e2e/api/test_food_api";
import test_all_integrations from "./integration/test_all_integrations";
import test_all_units from "./unit/test_all_units";

export default async function test_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                                                            ║");
  console.log(
    "║             🚀 WRTN Dish Backend 포괄적 테스트 스위트           ║",
  );
  console.log("║                                                            ║");
  console.log(
    "║           단위 테스트 → 통합 테스트 → E2E 테스트                  ║",
  );
  console.log("║                                                            ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n");

  const startTime = Date.now();
  const results: Array<{
    phase: string;
    status: "✅" | "❌";
    duration: number;
    error?: string;
  }> = [];

  // Phase 1: 단위 테스트
  console.log("📍 Phase 1: 단위 테스트 (Unit Tests)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const unitStart = Date.now();
  try {
    await test_all_units(connection);
    results.push({
      phase: "Unit Tests",
      status: "✅",
      duration: Date.now() - unitStart,
    });
  } catch (error: any) {
    results.push({
      phase: "Unit Tests",
      status: "❌",
      duration: Date.now() - unitStart,
      error: error.message,
    });
    console.error("\n❌ 단위 테스트 실패. 통합 테스트를 건너뜁니다.\n");
    throw error;
  }

  // Phase 2: 통합 테스트
  console.log("\n📍 Phase 2: 통합 테스트 (Integration Tests)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const integrationStart = Date.now();
  try {
    await test_all_integrations(connection);
    results.push({
      phase: "Integration Tests",
      status: "✅",
      duration: Date.now() - integrationStart,
    });
  } catch (error: any) {
    results.push({
      phase: "Integration Tests",
      status: "❌",
      duration: Date.now() - integrationStart,
      error: error.message,
    });
    console.error("\n❌ 통합 테스트 실패. E2E 테스트를 건너뜁니다.\n");
    throw error;
  }

  // Phase 3: E2E 테스트
  console.log("\n📍 Phase 3: E2E 테스트 (End-to-End Tests)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const e2eStart = Date.now();
  try {
    await test_food_api(connection);
    results.push({
      phase: "E2E Tests",
      status: "✅",
      duration: Date.now() - e2eStart,
    });
  } catch (error: any) {
    results.push({
      phase: "E2E Tests",
      status: "❌",
      duration: Date.now() - e2eStart,
      error: error.message,
    });
    console.error("\n❌ E2E 테스트 실패\n");
    throw error;
  }

  // 최종 결과 요약
  const totalDuration = Date.now() - startTime;
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                   🎉 최종 테스트 결과                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n");

  for (const result of results) {
    const durationSec = (result.duration / 1000).toFixed(2);
    console.log(`${result.status} ${result.phase} (${durationSec}s)`);
    if (result.error) {
      console.log(`   └─ ${result.error}`);
    }
  }

  console.log("\n");
  console.log(`⏱️  총 실행 시간: ${(totalDuration / 1000).toFixed(2)}초`);
  console.log(`✅ 모든 테스트 통과!`);
  console.log("\n");
}
