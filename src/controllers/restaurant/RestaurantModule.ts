import { Module } from "@nestjs/common";

import { RestaurantController } from "./RestaurantController";

/**
 * Restaurant API module
 * 
 * Module providing all restaurant-related functionalities.
 * Currently supports restaurant search using Naver Local Search API.
 */
@Module({
  controllers: [
    RestaurantController, // Restaurant search controller
  ],
})
export class RestaurantModule {} 