// models/City.js
//
// One document per player, separate from User (unlike the Dream School,
// which lives on User) because a city's tile map is unbounded-ish (up to
// GRID_SIZE^2 entries) where the school's whole save is four scalar fields.
//
// `tiles` is a Mongoose Map keyed "x_y" so empty tiles cost nothing to
// store — a fresh 24x24 plot is an empty map, not 576 documents.

import mongoose from "mongoose";
import { STARTING_TREASURY, DEFAULT_TAX_RATES } from "../config/cityCatalog.js";

const citySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  name: { type: String, required: true, trim: true, maxLength: 40 },
  territoryId: { type: String, default: "riverside" },
  treasury: { type: Number, default: STARTING_TREASURY },
  taxRates: {
    residential: { type: Number, default: DEFAULT_TAX_RATES.residential },
    business: { type: Number, default: DEFAULT_TAX_RATES.business },
  },
  // Placeholder for the happiness milestone — present now so the schema
  // doesn't need a migration when that lands.
  happiness: { type: Number, default: 100 },
  tiles: {
    type: Map,
    of: new mongoose.Schema({ buildingId: { type: String, required: true } }, { _id: false }),
    default: () => new Map(),
  },
  // Elapsed-time income accrual reads/writes this on every request that
  // touches the city — see computeIncomePerSec + city.controller.js. No
  // background job: the same "lazy, on-request" convention as the wallet.
  lastTickAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

export const City = mongoose.model("City", citySchema);
