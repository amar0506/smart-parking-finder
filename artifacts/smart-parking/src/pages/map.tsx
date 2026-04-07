import { useState } from "react";
import { useLocation } from "wouter";
import { MapPin, Navigation, Car, Train, ShoppingBag, Bus } from "lucide-react";
import { useGetLocations } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

// Satna, MP real coordinates
// Center: 24.5854, 80.8322
// Satna Railway Station: 24.5640, 80.8348
// City Mall area: 24.5900, 80.8400
// Bus Stand: 24.5712, 80.8297

const SATNA_BBOX = "80.790,24.540,80.890,24.620";
const MAP_SRC = `https://www.openstreetmap.org/export/embed.html?bbox=${SATNA_BBOX}&layer=mapnik&marker=24.5854,80.8322`;

// Map bounding box for overlay positioning
const MAP_WEST = 80.790, MAP_EAST = 80.890;
const MAP_NORTH = 24.620, MAP_SOUTH = 24.540;

function lngToPercent(lng: number) {
  return ((lng - MAP_WEST) / (MAP_EAST - MAP_WEST)) * 100;
}
function latToPercent(lat: number) {
  return ((MAP_NORTH - lat) / (MAP_NORTH - MAP_SOUTH)) * 100;
}

// Real Satna location data for map pins
const LOCATION_COORDS: Record<string, { lat: number; lng: number; icon: any; color: string }> = {
  "Railway Station Parking": { lat: 24.5640, lng: 80.8348, icon: Train, color: "bg-blue-600" },
  "City Mall Parking":       { lat: 24.5900, lng: 80.8400, icon: ShoppingBag, color: "bg-purple-600" },
  "Bus Stand Parking":       { lat: 24.5712, lng: 80.8297, icon: Bus, color: "bg-orange-600" },
};

function getCoords(name: string, index: number) {
  for (const key in LOCATION_COORDS) {
    if (name?.toLowerCase().includes(key.toLowerCase().split(" ")[0])) {
      return LOCATION_COORDS[key];
    }
  }
  // fallback
  const defaults = [
    { lat: 24.5640, lng: 80.8348, icon: Train, color: "bg-blue-600" },
    { lat: 24.5900, lng: 80.8400, icon: ShoppingBag, color: "bg-purple-600" },
    { lat: 24.5712, lng: 80.8297, icon: Bus, color: "bg-orange-600" },
  ];
  return defaults[index % defaults.length];
}

export default function MapView() {
  const [, setLocation] = useLocation();
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const { data: locations, isLoading } = useGetLocations();

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Satna City Map</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Satna, Madhya Pradesh, India · Smart Parking Locations
        </p>
      </div>

      <div className="flex-1 w-full rounded-xl border border-border overflow-hidden relative shadow-lg min-h-[280px]">
        {/* OpenStreetMap centered on Satna */}
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          src={MAP_SRC}
          style={{
            border: 0,
            filter: "invert(100%) hue-rotate(180deg) brightness(92%) contrast(85%) saturate(120%)"
          }}
          title="Satna City Map"
        />

        {/* City label */}
        <div className="absolute top-3 left-3 z-10 bg-black/70 backdrop-blur-sm text-xs text-white px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          Satna, Madhya Pradesh
        </div>

        {/* Location markers on map */}
        {locations?.map((loc, i) => {
          const coords = getCoords(loc.name, i);
          const left = lngToPercent(coords.lng);
          const top = latToPercent(coords.lat);
          const Icon = coords.icon;
          const isHovered = hoveredId === loc.id;
          const util = loc.totalSlots > 0
            ? Math.round(((loc.totalSlots - loc.availableSlots) / loc.totalSlots) * 100)
            : 0;

          return (
            <motion.div
              key={loc.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.15, type: "spring" }}
              className="absolute group cursor-pointer z-20"
              style={{ left: `${left}%`, top: `${top}%` }}
              onMouseEnter={() => setHoveredId(loc.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => setLocation("/dashboard")}
            >
              <div className="relative -translate-x-1/2 -translate-y-full flex flex-col items-center">
                <motion.div
                  animate={{ y: isHovered ? -4 : 0 }}
                  className={`${coords.color} text-white p-2 rounded-full shadow-lg border-2 border-white/30`}
                >
                  <Icon size={16} />
                </motion.div>
                <div className="w-0.5 h-3 bg-white/60" />
                <div className="w-2 h-1 bg-black/30 rounded-full blur-[2px]" />

                {/* Tooltip */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.9 }}
                      className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-card text-card-foreground p-3 rounded-xl shadow-2xl border border-border whitespace-nowrap pointer-events-none z-50 min-w-[160px]"
                    >
                      <p className="font-bold text-sm">{loc.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-green-400">{loc.availableSlots} free</span>
                        <span className="text-xs text-muted-foreground">/ {loc.totalSlots} total</span>
                      </div>
                      <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-red-400 h-1.5 rounded-full"
                          style={{ width: `${util}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{util}% occupied</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Location Cards */}
      <div className="overflow-x-auto pb-1">
        {isLoading ? (
          <div className="flex gap-4">
            <Skeleton className="w-[280px] h-[110px] rounded-xl shrink-0" />
            <Skeleton className="w-[280px] h-[110px] rounded-xl shrink-0" />
            <Skeleton className="w-[280px] h-[110px] rounded-xl shrink-0" />
          </div>
        ) : (
          <div className="flex gap-3 px-0.5">
            {locations?.map((loc, i) => {
              const coords = getCoords(loc.name, i);
              const Icon = coords.icon;
              const util = loc.totalSlots > 0
                ? Math.round(((loc.totalSlots - loc.availableSlots) / loc.totalSlots) * 100)
                : 0;

              return (
                <motion.div
                  key={loc.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="shrink-0 w-[270px]"
                >
                  <Card className="bg-card hover:border-primary/50 transition-colors cursor-pointer h-full"
                    onClick={() => setLocation("/dashboard")}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-9 h-9 rounded-lg ${coords.color} flex items-center justify-center shrink-0`}>
                          <Icon size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm leading-tight">{loc.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{loc.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Available</p>
                          <p className="font-bold text-green-400">{loc.availableSlots}
                            <span className="text-muted-foreground font-normal text-xs"> / {loc.totalSlots}</span>
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="text-xs h-7">
                          <Navigation size={12} className="mr-1" /> View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

