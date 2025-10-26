import { IWeatherConditions } from "../../../../src/api/structures/food/IFoodCategory";
import { ISimpleWeatherResponse } from "../../../../src/api/structures/weather/IWeatherForecast";
import { WeatherAnalysisService } from "../../../../src/services/WeatherAnalysisService";

/**
 * WeatherAnalysisService 단위 테스트
 * @description 날씨 분류 및 분석 로직 검증 (경계값 테스트 포함)
 */
export default async function test_weather_analysis_service(): Promise<void> {
  console.log("=== WeatherAnalysisService 단위 테스트 시작 ===\n");

  const service = new WeatherAnalysisService();

  // ========================================
  // 테스트 1: 온도 분류 - 경계값 테스트
  // ========================================
  console.log("테스트 1: 온도 분류 - 경계값 및 null 처리");

  // 1-1. null 값 처리
  const nullTemp = service.classifyTemperature(null);
  if (nullTemp !== "moderate") {
    throw new Error(`null 온도는 'moderate'여야 함: got '${nullTemp}'`);
  }
  console.log(`  ✓ null → 'moderate'`);

  // 1-2. cold 범위 (17°C 이하)
  const temp17 = service.classifyTemperature(17);
  if (temp17 !== "cold") {
    throw new Error(`17°C는 'cold'여야 함: got '${temp17}'`);
  }
  console.log(`  ✓ 17°C → 'cold'`);

  const temp17_9 = service.classifyTemperature(17.9);
  if (temp17_9 !== "cold") {
    throw new Error(`17.9°C는 'cold'여야 함: got '${temp17_9}'`);
  }
  console.log(`  ✓ 17.9°C → 'cold'`);

  // 1-3. moderate 범위 경계값 (18°C ~ 27.9°C)
  const temp18 = service.classifyTemperature(18);
  if (temp18 !== "moderate") {
    throw new Error(`18°C는 'moderate'여야 함: got '${temp18}'`);
  }
  console.log(`  ✓ 18°C (하한) → 'moderate'`);

  const temp22 = service.classifyTemperature(22.5);
  if (temp22 !== "moderate") {
    throw new Error(`22.5°C는 'moderate'여야 함: got '${temp22}'`);
  }
  console.log(`  ✓ 22.5°C (중간) → 'moderate'`);

  const temp27_9 = service.classifyTemperature(27.9);
  if (temp27_9 !== "moderate") {
    throw new Error(`27.9°C는 'moderate'여야 함: got '${temp27_9}'`);
  }
  console.log(`  ✓ 27.9°C (상한) → 'moderate'`);

  // 1-4. hot 범위 (28°C 이상)
  const temp28 = service.classifyTemperature(28);
  if (temp28 !== "hot") {
    throw new Error(`28°C는 'hot'이어야 함: got '${temp28}'`);
  }
  console.log(`  ✓ 28°C (경계) → 'hot'`);

  const temp35 = service.classifyTemperature(35);
  if (temp35 !== "hot") {
    throw new Error(`35°C는 'hot'이어야 함: got '${temp35}'`);
  }
  console.log(`  ✓ 35°C → 'hot'\n`);

  // ========================================
  // 테스트 2: 습도 분류 - 경계값 테스트
  // ========================================
  console.log("테스트 2: 습도 분류 - 경계값 및 null 처리");

  // 2-1. null 값 처리
  const nullHumidity = service.classifyHumidity(null);
  if (nullHumidity !== "moderate") {
    throw new Error(`null 습도는 'moderate'여야 함: got '${nullHumidity}'`);
  }
  console.log(`  ✓ null → 'moderate'`);

  // 2-2. low 범위 (39% 이하)
  const humidity30 = service.classifyHumidity(30);
  if (humidity30 !== "low") {
    throw new Error(`30%는 'low'여야 함: got '${humidity30}'`);
  }
  console.log(`  ✓ 30% → 'low'`);

  const humidity39 = service.classifyHumidity(39);
  if (humidity39 !== "low") {
    throw new Error(`39%는 'low'여야 함: got '${humidity39}'`);
  }
  console.log(`  ✓ 39% (경계) → 'low'`);

  // 2-3. moderate 범위 경계값 (40% ~ 69%)
  const humidity40 = service.classifyHumidity(40);
  if (humidity40 !== "moderate") {
    throw new Error(`40%는 'moderate'여야 함: got '${humidity40}'`);
  }
  console.log(`  ✓ 40% (하한) → 'moderate'`);

  const humidity55 = service.classifyHumidity(55);
  if (humidity55 !== "moderate") {
    throw new Error(`55%는 'moderate'여야 함: got '${humidity55}'`);
  }
  console.log(`  ✓ 55% (중간) → 'moderate'`);

  const humidity69 = service.classifyHumidity(69);
  if (humidity69 !== "moderate") {
    throw new Error(`69%는 'moderate'여야 함: got '${humidity69}'`);
  }
  console.log(`  ✓ 69% (상한) → 'moderate'`);

  // 2-4. high 범위 (70% 이상)
  const humidity70 = service.classifyHumidity(70);
  if (humidity70 !== "high") {
    throw new Error(`70%는 'high'여야 함: got '${humidity70}'`);
  }
  console.log(`  ✓ 70% (경계) → 'high'`);

  const humidity85 = service.classifyHumidity(85);
  if (humidity85 !== "high") {
    throw new Error(`85%는 'high'여야 함: got '${humidity85}'`);
  }
  console.log(`  ✓ 85% → 'high'\n`);

  // ========================================
  // 테스트 3: 극단값 처리
  // ========================================
  console.log("테스트 3: 극단값 처리");

  const tempMinus20 = service.classifyTemperature(-20);
  if (tempMinus20 !== "cold") {
    throw new Error(`-20°C는 'cold'여야 함: got '${tempMinus20}'`);
  }
  console.log(`  ✓ -20°C → 'cold'`);

  const temp50 = service.classifyTemperature(50);
  if (temp50 !== "hot") {
    throw new Error(`50°C는 'hot'이어야 함: got '${temp50}'`);
  }
  console.log(`  ✓ 50°C → 'hot'`);

  const humidity0 = service.classifyHumidity(0);
  if (humidity0 !== "low") {
    throw new Error(`0%는 'low'여야 함: got '${humidity0}'`);
  }
  console.log(`  ✓ 0% → 'low'`);

  const humidity100 = service.classifyHumidity(100);
  if (humidity100 !== "high") {
    throw new Error(`100%는 'high'여야 함: got '${humidity100}'`);
  }
  console.log(`  ✓ 100% → 'high'\n`);

  // ========================================
  // 테스트 4: analyzeWeatherForFoodRecommendation
  // ========================================
  console.log("테스트 4: 날씨 데이터 → 음식 추천용 조건 변환");

  const weatherData: ISimpleWeatherResponse = {
    location: { lat: 37.5665, lng: 126.978 },
    current: {
      temperature: 30,
      temperatureFeeling: "더움",
      sky: {
        code: 1,
        description: "맑음",
      },
      precipitation: {
        type: null,
        amount: null,
        status: "강수없음",
      },
      humidity: 75,
      wind: {
        speed: 2.5,
        direction: 180,
        description: "약한바람",
      },
      summary: "맑음, 30°C",
    },
    advice: {
      outdoorActivity: 4,
      umbrella: false,
      clothing: "반팔",
      message: "외출하기 좋은 날씨입니다.",
    },
    metadata: {
      success: true,
      requestTime: new Date().toISOString() as any,
      forecastTime: new Date().toISOString(),
      source: "기상청",
    },
  };

  const conditions = service.analyzeWeatherForFoodRecommendation(weatherData);

  if (conditions.temperature !== "hot") {
    throw new Error(`30°C는 'hot'이어야 함: got '${conditions.temperature}'`);
  }
  if (conditions.humidity !== "high") {
    throw new Error(`75%는 'high'여야 함: got '${conditions.humidity}'`);
  }
  if (conditions.actualTemperature !== 30) {
    throw new Error(
      `실제 온도 값 보존 실패: expected 30, got ${conditions.actualTemperature}`,
    );
  }
  if (conditions.actualHumidity !== 75) {
    throw new Error(
      `실제 습도 값 보존 실패: expected 75, got ${conditions.actualHumidity}`,
    );
  }

  console.log(`  ✓ 온도 30°C → 'hot'`);
  console.log(`  ✓ 습도 75% → 'high'`);
  console.log(`  ✓ 실제 값 보존 확인\n`);

  // ========================================
  // 테스트 5: null 값이 포함된 날씨 데이터
  // ========================================
  console.log("테스트 5: null 값 포함 날씨 데이터 처리");

  const weatherDataWithNull: ISimpleWeatherResponse = {
    location: { lat: 37.5665, lng: 126.978 },
    current: {
      temperature: null,
      temperatureFeeling: "알 수 없음",
      sky: {
        code: null,
        description: null,
      },
      precipitation: {
        type: null,
        amount: null,
        status: null,
      },
      humidity: null,
      wind: {
        speed: null,
        direction: null,
        description: null,
      },
      summary: "데이터 없음",
    },
    advice: {
      outdoorActivity: 3,
      umbrella: false,
      clothing: "적절한 옷차림",
      message: "날씨 정보를 가져올 수 없습니다.",
    },
    metadata: {
      success: false,
      requestTime: new Date().toISOString() as any,
      forecastTime: "알 수 없음",
      source: "기상청",
    },
  };

  const conditionsWithNull =
    service.analyzeWeatherForFoodRecommendation(weatherDataWithNull);

  if (conditionsWithNull.temperature !== "moderate") {
    throw new Error(
      `null 온도는 'moderate'여야 함: got '${conditionsWithNull.temperature}'`,
    );
  }
  if (conditionsWithNull.humidity !== "moderate") {
    throw new Error(
      `null 습도는 'moderate'여야 함: got '${conditionsWithNull.humidity}'`,
    );
  }
  if (conditionsWithNull.actualTemperature !== null) {
    throw new Error(`null 온도 값 보존 실패`);
  }
  if (conditionsWithNull.actualHumidity !== null) {
    throw new Error(`null 습도 값 보존 실패`);
  }

  console.log(`  ✓ null 온도/습도 → 'moderate'`);
  console.log(`  ✓ null 값 보존 확인\n`);

  // ========================================
  // 테스트 6: 설명 텍스트 생성
  // ========================================
  console.log("테스트 6: 사용자 친화적 설명 텍스트");

  const hotDesc = service.getTemperatureDescription("hot");
  if (!hotDesc.includes("더운")) {
    throw new Error(`'hot' 설명에 '더운' 포함 필요: got '${hotDesc}'`);
  }
  console.log(`  ✓ 'hot' → "${hotDesc}"`);

  const moderateTempDesc = service.getTemperatureDescription("moderate");
  if (!moderateTempDesc.includes("온화한")) {
    throw new Error(
      `'moderate' 설명에 '온화한' 포함 필요: got '${moderateTempDesc}'`,
    );
  }
  console.log(`  ✓ 'moderate' (온도) → "${moderateTempDesc}"`);

  const coldDesc = service.getTemperatureDescription("cold");
  if (!coldDesc.includes("추운")) {
    throw new Error(`'cold' 설명에 '추운' 포함 필요: got '${coldDesc}'`);
  }
  console.log(`  ✓ 'cold' → "${coldDesc}"`);

  const highHumidityDesc = service.getHumidityDescription("high");
  if (!highHumidityDesc.includes("높은")) {
    throw new Error(
      `'high' 설명에 '높은' 포함 필요: got '${highHumidityDesc}'`,
    );
  }
  console.log(`  ✓ 'high' (습도) → "${highHumidityDesc}"`);

  const moderateHumidityDesc = service.getHumidityDescription("moderate");
  if (!moderateHumidityDesc.includes("보통")) {
    throw new Error(
      `'moderate' 설명에 '보통' 포함 필요: got '${moderateHumidityDesc}'`,
    );
  }
  console.log(`  ✓ 'moderate' (습도) → "${moderateHumidityDesc}"`);

  const lowHumidityDesc = service.getHumidityDescription("low");
  if (!lowHumidityDesc.includes("낮은")) {
    throw new Error(`'low' 설명에 '낮은' 포함 필요: got '${lowHumidityDesc}'`);
  }
  console.log(`  ✓ 'low' (습도) → "${lowHumidityDesc}"\n`);

  // ========================================
  // 테스트 7: 종합 설명 생성
  // ========================================
  console.log("테스트 7: 날씨 종합 설명 생성");

  const summaryConditions: IWeatherConditions = {
    temperature: "hot",
    humidity: "high",
    actualTemperature: 32,
    actualHumidity: 80,
  };

  const summary = service.generateWeatherSummary(summaryConditions);

  if (!summary.includes("더운") || !summary.includes("높은")) {
    throw new Error(`종합 설명에 '더운'과 '높은' 포함 필요: got '${summary}'`);
  }

  console.log(`  ✓ 종합 설명: "${summary}"\n`);

  // ========================================
  // 테스트 8: 다양한 날씨 시나리오
  // ========================================
  console.log("테스트 8: 다양한 날씨 시나리오 조합");

  const scenarios = [
    { temp: 10, humidity: 30, expectedTemp: "cold", expectedHumidity: "low" },
    {
      temp: 25,
      humidity: 50,
      expectedTemp: "moderate",
      expectedHumidity: "moderate",
    },
    { temp: 32, humidity: 80, expectedTemp: "hot", expectedHumidity: "high" },
    { temp: 15, humidity: 75, expectedTemp: "cold", expectedHumidity: "high" },
    { temp: 30, humidity: 35, expectedTemp: "hot", expectedHumidity: "low" },
  ];

  for (const scenario of scenarios) {
    const weatherScenario: ISimpleWeatherResponse = {
      location: { lat: 37.5665, lng: 126.978 },
      current: {
        temperature: scenario.temp,
        temperatureFeeling: "테스트",
        sky: {
          code: 1,
          description: "맑음",
        },
        precipitation: {
          type: null,
          amount: null,
          status: "강수없음",
        },
        humidity: scenario.humidity,
        wind: {
          speed: 2.0,
          direction: 180,
          description: "약한바람",
        },
        summary: `테스트, ${scenario.temp}°C`,
      },
      advice: {
        outdoorActivity: 4,
        umbrella: false,
        clothing: "적절한 옷차림",
        message: "테스트 날씨입니다.",
      },
      metadata: {
        success: true,
        requestTime: new Date().toISOString() as any,
        forecastTime: new Date().toISOString(),
        source: "기상청",
      },
    };

    const result = service.analyzeWeatherForFoodRecommendation(weatherScenario);

    if (result.temperature !== scenario.expectedTemp) {
      throw new Error(
        `${scenario.temp}°C → expected '${scenario.expectedTemp}', got '${result.temperature}'`,
      );
    }
    if (result.humidity !== scenario.expectedHumidity) {
      throw new Error(
        `${scenario.humidity}% → expected '${scenario.expectedHumidity}', got '${result.humidity}'`,
      );
    }

    console.log(
      `  ✓ ${scenario.temp}°C, ${scenario.humidity}% → ${result.temperature}, ${result.humidity}`,
    );
  }

  console.log("\n=== ✅ WeatherAnalysisService 모든 테스트 통과 ===");
}
