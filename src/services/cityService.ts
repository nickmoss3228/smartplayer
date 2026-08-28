// services/cityService.ts
//
// Thin axios wrapper over /api/city, same shape as schoolServices.ts. Goes
// through the shared `api` instance (services/apiClient.ts) rather than a
// bare axios call so an expired token gets the same auto-logout handling
// every other feature gets.

import { api } from "./apiClient";

export interface CityTaxRates {
  residential: number;
  business: number;
}

export interface CityTile {
  buildingId: string;
}

export interface CityState {
  id: string;
  name: string;
  territoryId: string;
  treasury: number;
  taxRates: CityTaxRates;
  happiness: number;
  tiles: Record<string, CityTile>;
  incomePerSec: number;
}

export interface CityResponse {
  city: CityState;
}

export interface CityErrorBody {
  message?: string;
  reason?: string;
}

export const fetchCity = async (): Promise<CityState> => {
  const res = await api.get<CityResponse>("/api/city");
  return res.data.city;
};

export const createCity = async (name: string, territoryId: string): Promise<CityState> => {
  const res = await api.post<CityResponse>("/api/city", { name, territoryId });
  return res.data.city;
};

export const placeTileRequest = async (
  x: number,
  y: number,
  buildingId: string,
): Promise<CityState> => {
  const res = await api.post<CityResponse>("/api/city/tiles", { x, y, buildingId });
  return res.data.city;
};

export const bulldozeTileRequest = async (x: number, y: number): Promise<CityState> => {
  const res = await api.delete<CityResponse>("/api/city/tiles", { data: { x, y } });
  return res.data.city;
};

export const setTaxRatesRequest = async (
  patch: Partial<CityTaxRates>,
): Promise<CityState> => {
  const res = await api.patch<CityResponse>("/api/city/tax", patch);
  return res.data.city;
};
