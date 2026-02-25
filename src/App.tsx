import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Waves, 
  Clock, 
  MapPin, 
  Info, 
  ChevronRight, 
  Calendar, 
  AlertCircle,
  Anchor,
  Navigation,
  Thermometer,
  Wind,
  Activity,
  Video
} from 'lucide-react';
import { 
  format, 
  parse, 
  addHours, 
  subHours, 
  isWithinInterval, 
  isAfter, 
  addDays,
  startOfToday
} from 'date-fns';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine
} from 'recharts';

import { STATIONS, IDEAL_WINDOW_HOURS } from './constants';
import { TidePrediction, Station, CrabbingWindow, WeatherInfo } from './types';
import { fetchTidePredictions, fetchDetailedTideData, fetchWeatherInfo, fetchWeatherForecast } from './services/noaaService';

export default function App() {
  const [selectedStation, setSelectedStation] = useState<Station>(STATIONS[0]);
  const [predictions, setPredictions] = useState<TidePrediction[]>([]);
  const [detailedData, setDetailedData] = useState<{ t: string; v: string }[]>([]);
  const [weatherInfo, setWeatherInfo] = useState<WeatherInfo | null>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [preds, details, weather, weatherForecast] = await Promise.all([
          fetchTidePredictions(selectedStation.id),
          fetchDetailedTideData(selectedStation.id),
          fetchWeatherInfo(selectedStation.id),
          fetchWeatherForecast(selectedStation.lat, selectedStation.lng)
        ]);
        setPredictions(preds);
        setDetailedData(details);
        setWeatherInfo(weather);
        setForecast(weatherForecast);
      } catch (err) {
        setError('Failed to load tide data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedStation]);

  const crabbingWindows = useMemo(() => {
    return predictions
      .filter(p => p.type === 'L')
      .map(p => {
        const lowTideTime = parse(p.t, 'yyyy-MM-dd HH:mm', new Date());
        const start = subHours(lowTideTime, IDEAL_WINDOW_HOURS);
        const end = addHours(lowTideTime, IDEAL_WINDOW_HOURS);

        // Find weather for this window
        const windowForecasts = forecast.filter(f => {
          const fStart = new Date(f.startTime);
          const fEnd = new Date(f.endTime);
          return (fStart >= start && fStart < end) || (fEnd > start && fEnd <= end);
        });

        let tempRange = '';
        let windSpeed = '';

        if (windowForecasts.length > 0) {
          const temps = windowForecasts.map(f => f.temperature);
          const minTemp = Math.min(...temps);
          const maxTemp = Math.max(...temps);
          tempRange = minTemp === maxTemp ? `${minTemp}°${windowForecasts[0].temperatureUnit}` : `${minTemp}-${maxTemp}°${windowForecasts[0].temperatureUnit}`;
          
          // Use the wind speed from the middle of the window or first one
          windSpeed = windowForecasts[Math.floor(windowForecasts.length / 2)].windSpeed;
        }

        return {
          lowTideTime,
          lowTideHeight: p.v,
          start,
          end,
          tempRange,
          windSpeed
        };
      })
      .filter(w => isAfter(w.end, currentTime));
  }, [predictions, currentTime, forecast]);

  const currentWindow = useMemo(() => {
    return crabbingWindows.find(w => 
      isWithinInterval(currentTime, { start: w.start, end: w.end })
    );
  }, [crabbingWindows, currentTime]);

  const nextWindow = useMemo(() => {
    return crabbingWindows.find(w => isAfter(w.start, currentTime));
  }, [crabbingWindows, currentTime]);

  const chartData = useMemo(() => {
    return detailedData.map(d => ({
      time: parse(d.t, 'yyyy-MM-dd HH:mm', new Date()).getTime(),
      height: parseFloat(d.v),
      displayTime: format(parse(d.t, 'yyyy-MM-dd HH:mm', new Date()), 'HH:mm')
    }));
  }, [detailedData]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Anchor className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">SF Crabbing Guide</h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {format(currentTime, 'MMM d, HH:mm')}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar: Stations */}
          <div className="lg:col-span-4 space-y-6">
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <Navigation className="w-3 h-3" />
                Select Location
              </h2>
              <div className="space-y-2">
                {STATIONS.map((station) => (
                  <button
                    key={station.id}
                    onClick={() => setSelectedStation(station)}
                    className={`w-full text-left p-4 rounded-2xl transition-all border ${
                      selectedStation.id === station.id
                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                        : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className={`font-semibold flex items-center gap-2 ${selectedStation.id === station.id ? 'text-blue-700' : 'text-slate-800'}`}>
                          {station.name}
                          {station.webcamUrl && <Video className="w-3 h-3 opacity-40" />}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {station.description}
                        </p>
                      </div>
                      {selectedStation.id === station.id && (
                        <div className="bg-blue-600 rounded-full p-1">
                          <ChevronRight className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Info Card */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl overflow-hidden relative">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-5 h-5 text-blue-400" />
                  <h3 className="font-semibold">Crabbing Tip</h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  The "Golden Window" for crabbing is 2 hours before and after low tide. 
                  During this time, crabs are most active and easier to catch as the water moves slowly.
                </p>
              </div>
              <Waves className="absolute -bottom-4 -right-4 w-24 h-24 text-slate-800 opacity-50" />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Status Banner */}
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white border border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-4 shadow-sm"
                >
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-500 font-medium">Fetching NOAA tide data...</p>
                </motion.div>
              ) : error ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-50 border border-red-100 rounded-3xl p-8 flex items-center gap-4 text-red-700"
                >
                  <AlertCircle className="w-8 h-8 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold">Connection Error</h3>
                    <p className="text-sm opacity-90">{error}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  {/* Current Status Card */}
                  <div className={`rounded-3xl p-8 shadow-lg border transition-colors ${
                    currentWindow 
                      ? 'bg-emerald-50 border-emerald-200' 
                      : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              currentWindow 
                                ? 'bg-emerald-500 text-white' 
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {currentWindow ? 'Ideal Window Active' : 'Waiting for Window'}
                            </span>
                          </div>
                          <h2 className="text-3xl font-bold text-slate-900">
                            {selectedStation.name}
                          </h2>
                          <div className="flex items-center gap-4 text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" />
                              <span className="text-sm">{selectedStation.lat.toFixed(2)}, {selectedStation.lng.toFixed(2)}</span>
                            </div>
                            {selectedStation.webcamUrl && (
                              <a 
                                href={selectedStation.webcamUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors"
                              >
                                <Video className="w-4 h-4" />
                                <span>Live Webcam</span>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Weather Stats */}
                        <div className="flex flex-wrap gap-3">
                          {weatherInfo?.waterTemp && (
                            <div className="bg-blue-100/50 border border-blue-200 rounded-xl px-3 py-2 flex items-center gap-2">
                              <Thermometer className="w-4 h-4 text-blue-600" />
                              <div>
                                <p className="text-[10px] uppercase font-bold text-blue-500 leading-none mb-1">Water</p>
                                <p className="text-sm font-bold text-blue-900 leading-none">{weatherInfo.waterTemp}°F</p>
                              </div>
                            </div>
                          )}
                          {weatherInfo?.airTemp && (
                            <div className="bg-orange-100/50 border border-orange-200 rounded-xl px-3 py-2 flex items-center gap-2">
                              <Thermometer className="w-4 h-4 text-orange-600" />
                              <div>
                                <p className="text-[10px] uppercase font-bold text-orange-500 leading-none mb-1">Air</p>
                                <p className="text-sm font-bold text-orange-900 leading-none">{weatherInfo.airTemp}°F</p>
                              </div>
                            </div>
                          )}
                          {weatherInfo?.waveHeight && (
                            <div className="bg-indigo-100/50 border border-indigo-200 rounded-xl px-3 py-2 flex items-center gap-2">
                              <Activity className="w-4 h-4 text-indigo-600" />
                              <div>
                                <p className="text-[10px] uppercase font-bold text-indigo-500 leading-none mb-1">Waves</p>
                                <p className="text-sm font-bold text-indigo-900 leading-none">{weatherInfo.waveHeight} ft</p>
                              </div>
                            </div>
                          )}
                          {weatherInfo?.windSpeed && (
                            <div className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2">
                              <Wind className="w-4 h-4 text-slate-600" />
                              <div>
                                <p className="text-[10px] uppercase font-bold text-slate-500 leading-none mb-1">Wind</p>
                                <p className="text-sm font-bold text-slate-900 leading-none">{weatherInfo.windSpeed} kts</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        {currentWindow ? (
                          <div className="text-right">
                            <p className="text-sm text-emerald-600 font-semibold mb-1">Ends in</p>
                            <p className="text-4xl font-black text-emerald-700 tabular-nums">
                              {format(currentWindow.end, 'HH:mm')}
                            </p>
                          </div>
                        ) : nextWindow ? (
                          <div className="text-right">
                            <p className="text-sm text-slate-500 font-semibold mb-1">Next window starts at</p>
                            <p className="text-4xl font-black text-slate-900 tabular-nums">
                              {format(nextWindow.start, 'HH:mm')}
                            </p>
                          </div>
                        ) : (
                          <p className="text-slate-400">No windows found for today</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tide Chart */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Waves className="w-5 h-5 text-blue-500" />
                        24-Hour Tide Forecast
                      </h3>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 bg-blue-500/20 border border-blue-500 rounded-sm" />
                          <span className="text-slate-500">Tide Level (ft)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 bg-emerald-500/20 border border-emerald-500 rounded-sm" />
                          <span className="text-slate-500">Ideal Window</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorHeight" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis 
                            dataKey="time" 
                            type="number"
                            domain={['auto', 'auto']}
                            tickFormatter={(unixTime) => format(new Date(unixTime), 'HH:mm')}
                            stroke="#94A3B8"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#94A3B8"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#FFF', 
                              borderRadius: '12px', 
                              border: '1px solid #E2E8F0',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                            labelFormatter={(label) => format(new Date(label), 'HH:mm')}
                            formatter={(value: number) => [`${value.toFixed(2)} ft`, 'Height']}
                          />
                          {crabbingWindows.map((window, idx) => {
                            const Comp = ReferenceArea as any;
                            return (
                              <Comp
                                key={`window-${idx}`}
                                x1={window.start.getTime()}
                                x2={window.end.getTime()}
                                fill="#10B981"
                                fillOpacity={0.1}
                                stroke="#10B981"
                                strokeOpacity={0.2}
                              />
                            );
                          })}
                          <ReferenceLine 
                            x={currentTime.getTime()} 
                            stroke="#EF4444" 
                            strokeDasharray="3 3"
                            label={{ position: 'top', value: 'Now', fill: '#EF4444', fontSize: 10 }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="height" 
                            stroke="#3B82F6" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorHeight)" 
                            animationDuration={1500}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Upcoming Windows List */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      Upcoming Ideal Windows
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {crabbingWindows.map((window, idx) => (
                        <div 
                          key={idx}
                          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-200 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-xs font-bold text-blue-600 uppercase tracking-tight">
                                {format(window.lowTideTime, 'EEEE, MMM d')}
                              </p>
                              <h4 className="text-lg font-bold text-slate-800">
                                {format(window.start, 'HH:mm')} – {format(window.end, 'HH:mm')}
                              </h4>
                            </div>
                            <div className="bg-slate-50 px-2 py-1 rounded text-[10px] font-bold text-slate-500">
                              LOW {window.lowTideHeight}ft
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span>Low tide at {format(window.lowTideTime, 'HH:mm')}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
                            {window.tempRange && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                                <span>{window.tempRange}</span>
                              </div>
                            )}
                            {window.windSpeed && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                <Wind className="w-3.5 h-3.5 text-slate-400" />
                                <span>{window.windSpeed}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-200 mt-12 pb-[calc(3rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 opacity-50">
              <Anchor className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-widest">SF Crabbing Guide</span>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 max-w-xs mx-auto md:mx-0">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">iPhone Tip</p>
              <p className="text-xs text-blue-800 leading-tight">
                Tap the <span className="font-bold">Share</span> button in Safari and select <span className="font-bold">"Add to Home Screen"</span> to use this like a native app.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center md:text-right max-w-md">
            Data provided by NOAA Tides and Currents API. Always check local regulations and weather conditions before heading out.
          </p>
        </div>
      </footer>
    </div>
  );
}
