import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";

import { ChatModule } from "./controllers/chat/ChatModule";
import { WeatherModule } from "./controllers/weather/WeatherModule";
import { FoodModule } from "./controllers/food/FoodModule";
import { RestaurantModule } from "./controllers/restaurant/RestaurantModule";

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
  ],
})
export class MyModule {}
