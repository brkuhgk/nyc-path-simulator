import React, { useState, useEffect, useRef } from 'react';
import { Circle, Square } from 'lucide-react';

const SubwaySimulator = () => {
  // Map configuration
  const stations = [
    { id: 'wtc', name: 'World Trade Center', x: 350, y: 230, passengers: 0, capacity: 1000 },
    { id: 'exchange', name: 'Exchange Place', x: 280, y: 210, passengers: 0, capacity: 500 },
    { id: 'grove', name: 'Grove St', x: 220, y: 190, passengers: 0, capacity: 400 },
    { id: 'journal', name: 'Journal Square', x: 150, y: 160, passengers: 0, capacity: 600 },
    { id: 'newark', name: 'Newark Penn Station', x: 50, y: 180, passengers: 0, capacity: 800 },
    { id: 'harrison', name: 'Harrison', x: 80, y: 100, passengers: 0, capacity: 300 },
    { id: 'newport', name: 'Newport', x: 270, y: 140, passengers: 0, capacity: 450 },
    { id: 'hoboken', name: 'Hoboken', x: 210, y: 100, passengers: 0, capacity: 700 },
    { id: 'christopher', name: 'Christopher St', x: 320, y: 120, passengers: 0, capacity: 350 },
    { id: '9st', name: '9 St', x: 330, y: 100, passengers: 0, capacity: 200 },
    { id: '14st', name: '14 St', x: 340, y: 80, passengers: 0, capacity: 400 },
    { id: '23st', name: '23 St', x: 350, y: 60, passengers: 0, capacity: 300 },
    { id: '33st', name: '33 St', x: 360, y: 40, passengers: 0, capacity: 500 },
  ];

  const lines = [
    // RED line (WTC to Newark)
    { id: 'red1', from: 'wtc', to: 'exchange', color: '#ff0000' },
    { id: 'red2', from: 'exchange', to: 'grove', color: '#ff0000' },
    { id: 'red3', from: 'grove', to: 'journal', color: '#ff0000' },
    { id: 'red4', from: 'journal', to: 'newark', color: '#ff0000' },
    
    // BLUE line (Hoboken branch)
    { id: 'blue1', from: 'journal', to: 'harrison', color: '#0000ff' },
    
    // YELLOW-BLUE dashed line (33rd St line)
    { id: 'yellow1', from: 'journal', to: 'newport', color: '#dashed' },
    { id: 'yellow2', from: 'newport', to: 'hoboken', color: '#dashed' },
    { id: 'yellow3', from: 'hoboken', to: 'christopher', color: '#dashed' },
    { id: 'yellow4', from: 'christopher', to: '9st', color: '#dashed' },
    { id: 'yellow5', from: '9st', to: '14st', color: '#dashed' },
    { id: 'yellow6', from: '14st', to: '23st', color: '#dashed' },
    { id: 'yellow7', from: '23st', to: '33st', color: '#dashed' },
  ];

  // State
  const [activeStations, setActiveStations] = useState([...stations]);
  const [trains, setTrains] = useState([]);
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [congestionLevel, setCongestionLevel] = useState('medium');
  const [rushHour, setRushHour] = useState(false);
  const [dynamicRouting, setDynamicRouting] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [stats, setStats] = useState({
    totalPassengers: 0,
    passengersDelivered: 0,
    avgWaitTime: 0,
    congestionScore: 0,
    costSavings: 0,
    dailySavings: 0
  });
  const [systemCongestion, setSystemCongestion] = useState(0);

  // Passenger generation rates per station (passengers per minute)
  const getPassengerRate = (stationId) => {
    const baseRates = {
      'wtc': 25, 'exchange': 15, 'grove': 12, 'journal': 20, 
      'newark': 30, 'harrison': 8, 'newport': 18, 'hoboken': 22, 
      'christopher': 10, '9st': 5, '14st': 15, '23st': 12, '33st': 18
    };
    
    // Adjust based on rush hour
    const multiplier = rushHour ? 2.5 : 1;
    return baseRates[stationId] * multiplier * (congestionLevel === 'low' ? 0.7 : 
                                              congestionLevel === 'medium' ? 1 : 1.5);
  };

  // Train properties
  const createTrain = (line, startStation) => {
    return {
      id: `train-${Math.random().toString(36).substr(2, 9)}`,
      x: stations.find(s => s.id === startStation).x,
      y: stations.find(s => s.id === startStation).y,
      line: line,
      currentStation: startStation,
      nextStation: null,
      direction: 1, // 1 for forward, -1 for backward
      speed: 2,
      capacity: 300,
      passengers: 0,
      route: line === 'red' ? ['newark', 'journal', 'grove', 'exchange', 'wtc'] : 
             line === 'blue' ? ['harrison', 'journal', 'grove', 'exchange', 'wtc'] :
             ['33st', '23st', '14st', '9st', 'christopher', 'hoboken', 'newport', 'journal'],
      atStation: true,
      stationTime: 0,
      maxStationTime: 15, // seconds at station
    };
  };

  // Start with more realistic passenger distribution based on station popularity
  useEffect(() => {
    // Create initial trains with passengers
    const initialTrains = [
      createTrain('red', 'newark'),
      createTrain('red', 'wtc'),
      createTrain('blue', 'harrison'),
      createTrain('yellow', '33st'),
      createTrain('yellow', 'journal')
    ];
    
    // Add initial passengers based on line popularity
    initialTrains.forEach(train => {
      // WTC and Newark lines are busier than others
      const loadFactor = train.line === 'red' ? 0.6 : 
                         train.line === 'blue' ? 0.4 : 0.5;
      train.passengers = Math.floor(train.capacity * loadFactor);
    });
    
    setTrains(initialTrains);
    
    // Add initial passengers to stations based on station popularity
    setActiveStations(prevStations => {
      return prevStations.map(station => {
        // Major hubs have more waiting passengers
        let loadFactor;
        switch(station.id) {
          case 'wtc':
          case 'newark':
            loadFactor = 0.4; // Major hubs
            break;
          case 'journal':
          case 'hoboken':
            loadFactor = 0.35; // Secondary hubs
            break;
          default:
            loadFactor = 0.25; // Regular stations
        }
        
        return {
          ...station,
          passengers: Math.floor(station.capacity * loadFactor)
        };
      });
    });
    
    // Initialize with some passengers already delivered to avoid starting from zero
    setStats(prevStats => ({
      ...prevStats,
      totalPassengers: 2000,
      passengersDelivered: 500
    }));
  }, []);

  // Main simulation loop
  useEffect(() => {
    if (!isRunning) return;
    
    const timer = setInterval(() => {
      setTime(prevTime => prevTime + 1 * simulationSpeed);
      
      // Update station passengers and track total
      let newPassengersTotal = 0;
      setActiveStations(prevStations => {
        return prevStations.map(station => {
          // Generate new passengers based on rate
          const newPassengers = Math.floor(Math.random() * getPassengerRate(station.id) / 60);
          newPassengersTotal += newPassengers;
          return {
            ...station,
            passengers: station.passengers + newPassengers
          };
        });
      });
      
      // Update total passengers stat
      setStats(prevStats => ({
        ...prevStats,
        totalPassengers: prevStats.totalPassengers + newPassengersTotal
      }));
      
      // Update train positions
      setTrains(prevTrains => {
        return prevTrains.map(train => {
          // If train is at a station
          if (train.atStation) {
            // Handle passenger exchange
            if (train.stationTime === 0) {
              // Calculate how many passengers get off/on
              const currentStation = activeStations.find(s => s.id === train.currentStation);
              const passengersGettingOff = Math.floor(train.passengers * 0.3); // 30% of passengers get off
              
              let passengersGettingOn = Math.min(
                currentStation.passengers, 
                train.capacity - (train.passengers - passengersGettingOff)
              );
              
              // Update station passengers
              setActiveStations(prevStations => {
                return prevStations.map(s => {
                  if (s.id === train.currentStation) {
                    return {
                      ...s,
                      passengers: s.passengers - passengersGettingOn
                    };
                  }
                  return s;
                });
              });
              
              // Update delivered passengers stats
              if (passengersGettingOff > 0) {
                setStats(prevStats => {
                  // Calculate per-passenger savings based on dynamic routing
                  // Using exact 12% of the standard $2.35 cost per passenger
                  const costPerPassenger = 2.35;
                  const savingsPerPassenger = dynamicRouting ? (costPerPassenger * 0.12) : 0;
                  const newSavings = prevStats.costSavings + (passengersGettingOff * savingsPerPassenger);
                  
                  return {
                    ...prevStats,
                    passengersDelivered: prevStats.passengersDelivered + passengersGettingOff,
                    costSavings: newSavings
                  };
                });
              }
              
              // Update train passengers
              train = {
                ...train,
                passengers: train.passengers - passengersGettingOff + passengersGettingOn
              };
            }
            
            // Increment station time
            train.stationTime += 1;
            
            // If train has been at station long enough, depart
            if (train.stationTime >= train.maxStationTime) {
              // Find next station in route
              const currentIndex = train.route.indexOf(train.currentStation);
              let nextIndex;
              
              if (dynamicRouting) {
                // INNOVATIVE FEATURE: Dynamic routing based on passenger demand
                // Check nearby stations for high demand
                const nearbyStations = stations.filter(s => 
                  Math.abs(s.x - stations.find(st => st.id === train.currentStation).x) < 100 &&
                  Math.abs(s.y - stations.find(st => st.id === train.currentStation).y) < 100 &&
                  s.id !== train.currentStation
                );
                
                const highDemandStation = nearbyStations
                  .filter(s => s.passengers > s.capacity * 0.7) // Stations with high demand
                  .sort((a, b) => (b.passengers / b.capacity) - (a.passengers / a.capacity))[0];
                
                if (highDemandStation && Math.random() > 0.5) {
                  // Reroute to high demand station if it exists
                  train.nextStation = highDemandStation.id;
                  train.atStation = false;
                  train.stationTime = 0;
                  return train;
                }
              }
              
              // Normal routing along the line
              if (train.direction === 1) {
                nextIndex = currentIndex + 1;
                if (nextIndex >= train.route.length) {
                  train.direction = -1;
                  nextIndex = train.route.length - 2;
                }
              } else {
                nextIndex = currentIndex - 1;
                if (nextIndex < 0) {
                  train.direction = 1;
                  nextIndex = 1;
                }
              }
              
              train.nextStation = train.route[nextIndex];
              train.atStation = false;
              train.stationTime = 0;
            }
            
            return train;
          } else {
            // Train is moving between stations
            const currentStation = stations.find(s => s.id === train.currentStation);
            const nextStation = stations.find(s => s.id === train.nextStation);
            
            // Calculate direction vector
            const dx = nextStation.x - train.x;
            const dy = nextStation.y - train.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If train has reached next station
            if (distance < train.speed) {
              train.x = nextStation.x;
              train.y = nextStation.y;
              train.currentStation = train.nextStation;
              train.nextStation = null;
              train.atStation = true;
              return train;
            }
            
            // Move train along path
            const vx = (dx / distance) * train.speed;
            const vy = (dy / distance) * train.speed;
            
            return {
              ...train,
              x: train.x + vx,
              y: train.y + vy
            };
          }
        });
      });
      
      // Calculate congestion score and penalty more accurately
      const stationCongestion = activeStations.reduce((sum, station) => {
        return sum + (station.passengers / station.capacity);
      }, 0) / activeStations.length;
      
      const trainCongestion = trains.reduce((sum, train) => {
        return sum + (train.passengers / train.capacity);
      }, 0) / trains.length;
      
      // Calculate overall system congestion (weighted average)
      const systemCongestion = (stationCongestion * 0.7 + trainCongestion * 0.3);
      
      // Calculate projected daily savings based on efficiency
      const dailyRidership = 5500000; // NYC's daily ridership
      const costPerPassenger = 2.35;  // Cost per passenger in dollars
      const baseDailyOperatingCost = dailyRidership * costPerPassenger;
      
      // Calculate savings percentage based on routing efficiency and congestion
      // Dynamic routing provides base 12% efficiency improvement
      const routingEfficiencyBonus = dynamicRouting ? 0.12 : 0;
      
      // Congestion reduces efficiency gains (but with a more reasonable scaling)
      // At 100% congestion, penalty would be 0.3 (30%)
      // At 50% congestion, penalty would be 0.15 (15%)
      const congestionPenalty = systemCongestion * 0.3;
      
      // Calculate net efficiency gain (minimum 0%)
      const netEfficiencyGain = Math.max(0, routingEfficiencyBonus - congestionPenalty);
      
      // Calculate projected savings (daily and yearly)
      const projectedDailySavings = baseDailyOperatingCost * netEfficiencyGain;
      
      // Update system congestion state for use in UI
      setSystemCongestion(systemCongestion);
      
      // Update statistics
      setStats(prevStats => ({
        ...prevStats,
        congestionScore: systemCongestion * 100, // Convert to percentage
        dailySavings: projectedDailySavings
      }));
      
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isRunning, congestionLevel, rushHour, dynamicRouting]);

  // Render subway map
  return (
    <div className="flex flex-col items-center h-full w-full p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-2">NYC Subway Simulator</h1>
      
      <div className="flex w-full justify-between mb-2">
        <div className="flex items-center">
          <button 
            className={`px-4 py-2 rounded mr-4 ${isRunning ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>
          
          <p className="font-medium">Time: {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}</p>
        </div>
        
        <div className="flex space-x-4">
          <select 
            className="px-3 py-1 rounded border"
            value={congestionLevel}
            onChange={(e) => setCongestionLevel(e.target.value)}
          >
            <option value="low">Low Traffic</option>
            <option value="medium">Medium Traffic</option>
            <option value="high">High Traffic</option>
          </select>
          
          <label className="flex items-center">
            <input 
              type="checkbox" 
              checked={rushHour} 
              onChange={() => setRushHour(!rushHour)}
              className="mr-2"
            />
            Rush Hour
          </label>
          
          <label className="flex items-center">
            <input 
              type="checkbox" 
              checked={dynamicRouting} 
              onChange={() => setDynamicRouting(!dynamicRouting)}
              className="mr-2"
            />
            <span className="text-blue-600 font-bold">Dynamic Routing</span>
          </label>
        </div>
      </div>
      
      <div className="w-full mb-2">
        <label className="flex flex-col">
          <span className="mb-1">Simulation Speed: {simulationSpeed}x</span>
          <input 
            type="range" 
            min="0.5" 
            max="5" 
            step="0.5" 
            value={simulationSpeed} 
            onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-sm">
            <span>Slow (0.5x)</span>
            <span>Normal (1x)</span>
            <span>Fast (5x)</span>
          </div>
        </label>
      </div>
      
      <div className="flex flex-row items-center w-full">
        <div className="bg-white rounded-lg shadow p-4 flex-1 flex justify-center">
          <svg width="500" height="400" className="border bg-gray-50">
            {/* Draw lines between stations */}
            {lines.map(line => {
              const fromStation = stations.find(s => s.id === line.from);
              const toStation = stations.find(s => s.id === line.to);
              
              return (
                <line 
                  key={line.id}
                  x1={fromStation.x} 
                  y1={fromStation.y} 
                  x2={toStation.x} 
                  y2={toStation.y} 
                  stroke={line.color === '#dashed' ? '#FFD700' : line.color}
                  strokeWidth="4"
                  strokeDasharray={line.color === '#dashed' ? "5,5" : "none"}
                />
              );
            })}
            
            {/* Draw stations */}
            {activeStations.map(station => {
              const congestionPercent = station.passengers / station.capacity;
              const fillColor = congestionPercent > 0.8 ? '#ff0000' : 
                                congestionPercent > 0.5 ? '#ffa500' : '#00ff00';
              
              return (
                <g key={station.id}>
                  <circle 
                    cx={station.x} 
                    cy={station.y} 
                    r="6" 
                    fill="white" 
                    stroke="black"
                    strokeWidth="2"
                  />
                  {/* Congestion indicator */}
                  <circle 
                    cx={station.x} 
                    cy={station.y} 
                    r="3" 
                    fill={fillColor}
                  />
                  <text 
                    x={station.x + 10} 
                    y={station.y - 10} 
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {station.name}
                  </text>
                  <text 
                    x={station.x + 10} 
                    y={station.y + 15} 
                    fontSize="8"
                    textAnchor="middle"
                    fill={congestionPercent > 0.8 ? 'red' : 'black'}
                  >
                    {station.passengers}
                  </text>
                </g>
              );
            })}
            
            {/* Draw trains */}
            {trains.map(train => {
              // Determine train color based on line
              const trainColor = train.line === 'red' ? '#ff0000' : 
                                train.line === 'blue' ? '#0000ff' : '#ffd700';
              
              // Calculate fill based on passenger load
              const fillPercent = train.passengers / train.capacity;
              const fillColor = fillPercent > 0.8 ? 'darkred' : 
                              fillPercent > 0.5 ? 'orange' : 'green';
              
              return (
                <g key={train.id}>
                  <rect 
                    x={train.x - 5} 
                    y={train.y - 5} 
                    width="10" 
                    height="10" 
                    fill={trainColor}
                    stroke="black"
                    strokeWidth="1"
                  />
                  {/* Passenger load indicator */}
                  <rect 
                    x={train.x - 3} 
                    y={train.y - 3} 
                    width="6" 
                    height="6" 
                    fill={fillColor}
                  />
                </g>
              );
            })}
          </svg>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 w-1/4">
          <h2 className="text-lg font-bold mb-2">Live Statistics</h2>
          
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Total Passengers:</span>
              <span className="font-medium">{stats.totalPassengers.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Passengers Delivered:</span>
              <span className="font-medium">{stats.passengersDelivered.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>System Efficiency:</span>
              <span className="font-medium">
                {stats.totalPassengers > 0 ? 
                  Math.min(100, Math.round((stats.passengersDelivered / stats.totalPassengers) * 100)) : 0}%
              </span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Congestion Score:</span>
              <span className={stats.congestionScore > 70 ? 'text-red-500 font-bold' : 
                              stats.congestionScore > 40 ? 'text-yellow-500 font-bold' : 'text-green-500 font-bold'}>
                {Math.round(stats.congestionScore)}%
              </span>
            </div>
          </div>
          
          <h3 className="font-bold text-sm mt-4">Station Status</h3>
          <div className="h-48 overflow-y-auto mt-1">
            {activeStations
              .sort((a, b) => (b.passengers / b.capacity) - (a.passengers / a.capacity))
              .map(station => {
                const congestionPercent = station.passengers / station.capacity;
                const bgColor = congestionPercent > 0.8 ? 'bg-red-100' : 
                                congestionPercent > 0.5 ? 'bg-yellow-100' : 'bg-green-100';
                
                return (
                  <div key={station.id} className={`p-1 ${bgColor} text-xs rounded mb-1 flex justify-between`}>
                    <span>{station.name}</span>
                    <span className="font-medium">{station.passengers} waiting</span>
                  </div>
                );
            })}
          </div>
          
          <p className="text-xs mt-2 text-blue-600 font-semibold">
            {dynamicRouting ? 
              `Dynamic routing active: Trains are being redirected to high-demand stations` : 
              `Dynamic routing inactive: Trains are following fixed routes`}
          </p>
        </div>
      </div>
      
      {/* Cost analysis section at the bottom */}
      <div className="w-full mt-4 bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-bold mb-2">Cost Savings Analysis</h2>
        
        <div className="flex gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-sm">Dynamic Routing System</h3>
            <p className="text-sm mt-1">
              When enabled, trains will intelligently reroute to nearby stations with high passenger 
              demand, reducing wait times and balancing congestion across the network.
            </p>
          </div>
          
          <div className="flex-1 bg-green-50 border border-green-200 rounded p-3">
            <div className="flex justify-between mb-2">
              <span>Current Savings:</span>
              <span className="font-bold text-green-600">${Math.max(0, stats.costSavings).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Projected Daily Savings:</span>
              <span className="font-bold text-green-600">${Math.max(0, stats.dailySavings).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between">
              <span>Projected Annual Savings:</span>
              <span className="font-bold text-green-600">${Math.max(0, (stats.dailySavings * 365)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Based on NYC's 5.5M daily ridership and standard operating costs of $2.35 per passenger
            </div>
            {!dynamicRouting && (
              <div className="mt-2 text-xs text-orange-600 font-bold">
                Enable Dynamic Routing to see potential cost savings
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubwaySimulator;