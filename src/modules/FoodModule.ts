import { Module } from "@nestjs/common";

import { FoodEvaluationController } from "../controllers/food/FoodEvaluationController";
import { WeatherModule } from "../controllers/weather/WeatherModule";
import { FoodEvaluationService } from "../services/FoodEvaluationService";
import { FoodScoringService } from "../services/FoodScoringService";
import { WeatherAnalysisService } from "../services/WeatherAnalysisService";

/**
 * 음식 추천 모듈
 * @description 날씨 기반 음식 평가 및 추천 기능을 제공하는 모듈
 */
@Module({
  imports: [
    WeatherModule, // 날씨 서비스 의존성
  ],
  controllers: [FoodEvaluationController],
  providers: [
    FoodEvaluationService,
    WeatherAnalysisService,
    FoodScoringService,
  ],
  exports: [FoodEvaluationService, WeatherAnalysisService, FoodScoringService],
})
export class FoodModule {}