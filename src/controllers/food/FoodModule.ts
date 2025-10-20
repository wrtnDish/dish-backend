import { Module } from "@nestjs/common";

import { FoodService } from "../../services/FoodService";
import { FoodController } from "./FoodController";

@Module({
  controllers: [FoodController],
  providers: [FoodService],
  exports: [FoodService],
})
export class FoodModule {}
