import { Module } from "@nestjs/common";
import { FoodController } from "./FoodController";


@Module({
  controllers: [FoodController],
})
export class FoodModule {}
