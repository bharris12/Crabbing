export interface TidePrediction {
  t: string; // Date and time
  v: string; // Tide height
  type: 'H' | 'L'; // High or Low tide
}

export interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
  webcamUrl?: string;
}

export interface WeatherInfo {
  waterTemp?: string;
  airTemp?: string;
  waveHeight?: string;
  windSpeed?: string;
}

export interface CrabbingWindow {
  start: Date;
  end: Date;
  lowTideTime: Date;
  lowTideHeight: string;
  tempRange?: string;
  windSpeed?: string;
}
