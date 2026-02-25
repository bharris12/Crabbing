import { TidePrediction, WeatherInfo } from '../types';
import { format, addDays } from 'date-fns';

export async function fetchWeatherInfo(stationId: string): Promise<WeatherInfo> {
  const products = ['water_temperature', 'air_temperature', 'wind'];
  const results: WeatherInfo = {};

  const fetchProduct = async (product: string) => {
    const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=${product}&station=${stationId}&time_zone=lst_ldt&units=english&format=json&date=latest`;
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      return data.data?.[0] || data.metadata || null;
    } catch {
      return null;
    }
  };

  try {
    const [waterData, airData, windData] = await Promise.all(products.map(fetchProduct));

    if (waterData) results.waterTemp = waterData.v;
    if (airData) results.airTemp = airData.v;
    if (windData) results.windSpeed = windData.s;

    // Waves are often only at specific buoy stations, but we can try
    const waveData = await fetchProduct('waves');
    if (waveData) results.waveHeight = waveData.v || waveData.s; // v is usually significant wave height
  } catch (error) {
    console.error('Error fetching weather info:', error);
  }

  return results;
}

export async function fetchWeatherForecast(lat: number, lng: number): Promise<any[]> {
  try {
    // 1. Get grid points
    const pointsRes = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`);
    if (!pointsRes.ok) return [];
    const pointsData = await pointsRes.json();
    const forecastUrl = pointsData.properties.forecastHourly;

    // 2. Get hourly forecast
    const forecastRes = await fetch(forecastUrl);
    if (!forecastRes.ok) return [];
    const forecastData = await forecastRes.json();
    return forecastData.properties.periods || [];
  } catch (error) {
    console.error('Error fetching weather forecast:', error);
    return [];
  }
}

export async function fetchTidePredictions(stationId: string): Promise<TidePrediction[]> {
  const today = new Date();
  const startDate = format(today, 'yyyyMMdd');
  const endDate = format(addDays(today, 3), 'yyyyMMdd');

  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&datum=MLLW&station=${stationId}&time_zone=lst_ldt&units=english&format=json&interval=hilo&begin_date=${startDate}&end_date=${endDate}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NOAA API error: ${response.statusText}`);
    }
    const data = await response.json();
    return data.predictions || [];
  } catch (error) {
    console.error('Failed to fetch tide predictions:', error);
    return [];
  }
}

export async function fetchDetailedTideData(stationId: string): Promise<{ t: string; v: string }[]> {
  const today = new Date();
  const startDate = format(today, 'yyyyMMdd');
  const endDate = format(addDays(today, 1), 'yyyyMMdd');

  // Fetching every 6 minutes for a smooth chart
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&datum=MLLW&station=${stationId}&time_zone=lst_ldt&units=english&format=json&begin_date=${startDate}&end_date=${endDate}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NOAA API error: ${response.statusText}`);
    }
    const data = await response.json();
    return data.predictions || [];
  } catch (error) {
    console.error('Failed to fetch detailed tide data:', error);
    return [];
  }
}
