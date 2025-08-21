import { Module } from "@nestjs/common";
import { FoodController } from "./FoodController";
import { FoodService } from "../../services/FoodService";

@Module({
  controllers: [FoodController],
  providers: [FoodService],
  exports: [FoodService],
})
export class FoodModule {}
