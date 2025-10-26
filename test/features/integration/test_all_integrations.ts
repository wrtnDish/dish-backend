/**
 * 모든 통합 테스트 실행
 * @description Service 간 연동 및 통합 시나리오 테스트
 */
import api from "../../../src/api";
import test_service_integration from "./services/test_service_integration";

export default async function test_all_integrations(
  connection: api.IConnection,
): Promise<void> {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log(
    "║                 🔗 통합 테스트 전체 실행 시작                    ║",
  );
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n");

  const tests = [{ name: "Service Integration", fn: test_service_integration }];

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
  console.log(
    "║                       📊 테스트 결과 요약                      ║",
  );
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
    throw new Error(`${failed}개의 통합 테스트가 실패했습니다`);
  }
}
