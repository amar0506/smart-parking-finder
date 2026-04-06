import { useLocation } from "wouter";
import { MapPin, Navigation, Car } from "lucide-react";
import { useGetLocations } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function MapView() {
  const [, setLocation] = useLocation();
  const { data: locations, isLoading } = useGetLocations();

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">City Map</h1>
        <p className="text-muted-foreground mt-1">Locate parking facilities across the city.</p>
      </div>

      <div className="flex-1 w-full rounded-xl border border-border overflow-hidden relative shadow-lg">
        {/* Beautiful Map Fallback using OpenStreetMap via iframe for real map feel */}
        <iframe 
          width="100%" 
          height="100%" 
          frameBorder="0" 
          scrolling="no" 
          marginHeight={0} 
          marginWidth={0} 
          src="https://www.openstreetmap.org/export/embed.html?bbox=-122.5,37.7,-122.4,37.8&layer=mapnik" 
          style={{ border: 0, filter: 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)' }} // Dark mode filter
        ></iframe>
        
        {/* Overlay markers (simulated positions) */}
        {locations?.map((loc, i) => {
          // Fake coordinates to place them nicely on the dummy map area
          const top = `${30 + (i * 15) % 40}%`;
          const left = `${40 + (i * 20) % 40}%`;
          
          return (
            <motion.div 
              key={loc.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1, type: "spring" }}
              className="absolute group cursor-pointer"
              style={{ top, left }}
            >
              <div className="relative -ml-4 -mt-8 flex flex-col items-center">
                <div className="bg-primary text-primary-foreground p-2 rounded-full shadow-lg">
                  <MapPin size={20} />
                </div>
                <div className="w-1 h-3 bg-primary" />
                <div className="w-2 h-1 bg-black/50 rounded-full blur-[2px]" />
                
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-card text-card-foreground p-2 rounded shadow-xl border border-border whitespace-nowrap pointer-events-none z-50">
                  <p className="font-bold text-sm">{loc.name}</p>
                  <p className="text-xs text-[hsl(var(--available))]">{loc.availableSlots} available</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="h-48 overflow-x-auto">
        {isLoading ? (
          <div className="flex gap-4 pb-4">
            <Skeleton className="w-[300px] h-[120px] rounded-xl shrink-0" />
            <Skeleton className="w-[300px] h-[120px] rounded-xl shrink-0" />
          </div>
        ) : (
          <div className="flex gap-4 pb-4 px-1">
            {locations?.map(loc => (
              <Card key={loc.id} className="w-[300px] shrink-0 bg-card hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <div>
                    <h3 className="font-bold text-lg">{loc.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{loc.address}</p>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Available</span>
                      <span className="font-bold text-[hsl(var(--available))]">{loc.availableSlots} / {loc.totalSlots}</span>
                    </div>
                    <Button size="sm" onClick={() => setLocation("/dashboard")}>
                      <Navigation size={14} className="mr-2" />
                      View Slots
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}