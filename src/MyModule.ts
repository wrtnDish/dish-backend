import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";

import { ChatModule } from "./controllers/chat/ChatModule";
import { WeatherModule } from "./controllers/weather/WeatherModule";
import { RestaurantModule } from "./controllers/restaurant/RestaurantModule";
import { FoodModule } from "./modules/FoodModule";
import { FoodModule as SatietyFoodModule } from "./controllers/food/FoodModule";

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "client"),
      serveRoot: "/",
    }),
    ChatModule,
    WeatherModule,
    FoodModule,
    RestaurantModule,
    FoodModule,
    SatietyFoodModule,
  ],
})
export class MyModule {}
