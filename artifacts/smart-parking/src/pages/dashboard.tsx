import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Car,
  MapPin,
  Clock,
  Ban,
  BatteryCharging,
  Accessibility,
  Shrink
} from "lucide-react";
import {
  useGetLocations,
  useGetSlots,
  useGetDashboardSummary
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: locations } = useGetLocations();
  const { data: slots, isLoading: isSlotsLoading } = useGetSlots(
    { locationId: selectedLocationId },
    { query: { enabled: true } }
  );

  const getSlotTypeIcon = (type: string) => {
    switch (type) {
      case "electric": return <BatteryCharging size={14} className="text-blue-400" />;
      case "handicap": return <Accessibility size={14} className="text-blue-400" />;
      case "compact": return <Shrink size={14} className="text-blue-400" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time parking availability and metrics.</p>
        </div>
        
        <div className="w-full md:w-64">
          <Select 
            value={selectedLocationId ? selectedLocationId.toString() : "all"} 
            onValueChange={(v) => setSelectedLocationId(v === "all" ? null : parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations?.map(loc => (
                <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Slots</CardTitle>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-bold">{summary?.totalSlots || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available</CardTitle>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-bold text-[hsl(var(--available))]">{summary?.availableSlots || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Booked</CardTitle>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-bold text-[hsl(var(--booked))]">{summary?.bookedSlots || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Locations</CardTitle>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-bold">{summary?.totalLocations || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3D Visualization */}
      <div className="hidden md:block w-full h-[200px] bg-card rounded-lg border border-border overflow-hidden relative perspective-[1000px]">
        <div className="absolute top-4 left-4 z-10 text-sm font-medium text-muted-foreground">3D View (Simulated)</div>
        <div className="w-full h-full flex items-center justify-center relative transform-style-preserve-3d rotate-x-[60deg] rotate-z-[-20deg] scale-[0.8] mt-8">
          <div className="grid grid-cols-10 gap-2 p-4 bg-muted/20 border-2 border-dashed border-border rounded-xl">
            {Array.from({ length: 40 }).map((_, i) => {
              const isBooked = i % 5 === 0 || i % 7 === 0;
              return (
                <div 
                  key={i} 
                  className={`w-12 h-16 rounded border ${
                    isBooked 
                      ? 'bg-[hsl(var(--booked))/20] border-[hsl(var(--booked))/50]' 
                      : 'bg-[hsl(var(--available))/10] border-[hsl(var(--available))/30]'
                  } flex flex-col items-center justify-end pb-2 transform transition-transform`}
                  style={{ transform: `translateZ(${isBooked ? 10 : 0}px)` }}
                >
                  {isBooked && (
                    <motion.div 
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-[hsl(var(--booked))] drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"
                    >
                      <Car size={24} />
                    </motion.div>
                  )}
                  <div className="w-6 h-1 border-t-2 border-[hsl(var(--muted-foreground))] mt-2 opacity-50" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Slots Grid */}
      <div>
        <h2 className="text-xl font-bold mb-4">Parking Slots</h2>
        {isSlotsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : slots?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border border-border">
            No slots found for this location.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <AnimatePresence>
              {slots?.map((slot, index) => {
                const isAvailable = slot.status === "available";
                const isBooked = slot.status === "booked";
                const isMaintenance = slot.status === "maintenance";

                return (
                  <motion.div
                    key={slot.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                  >
                    <Card 
                      className={`h-full cursor-pointer transition-all hover:shadow-lg ${
                        isAvailable ? 'hover:border-[hsl(var(--available))] hover:bg-[hsl(var(--available))/5]' : 
                        isBooked ? 'opacity-80 cursor-not-allowed' : 
                        'opacity-50 cursor-not-allowed grayscale'
                      }`}
                      onClick={() => {
                        if (isAvailable) setLocation(`/booking/${slot.id}`);
                      }}
                    >
                      <CardContent className="p-4 flex flex-col h-full justify-between relative overflow-hidden">
                        <div className="flex justify-between items-start mb-2 relative z-10">
                          <span className="font-bold text-lg">{slot.slotNumber}</span>
                          {getSlotTypeIcon(slot.type)}
                        </div>
                        
                        <div className="text-xs text-muted-foreground mb-4 relative z-10">
                          {slot.locationName} • Floor {slot.floor}
                        </div>

                        <div className="relative z-10">
                          <Badge variant="outline" className={`
                            ${isAvailable ? 'text-[hsl(var(--available))] border-[hsl(var(--available))/30] bg-[hsl(var(--available))/10]' : ''}
                            ${isBooked ? 'text-[hsl(var(--booked))] border-[hsl(var(--booked))/30] bg-[hsl(var(--booked))/10]' : ''}
                            ${isMaintenance ? 'text-muted-foreground border-muted' : ''}
                          `}>
                            {slot.status.toUpperCase()}
                          </Badge>
                        </div>
                        
                        {isBooked && (
                          <motion.div 
                            initial={{ x: -50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="absolute bottom-2 right-2 text-[hsl(var(--booked))] opacity-20"
                          >
                            <Car size={64} />
                          </motion.div>
                        )}
                        
                        {isMaintenance && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-10">
                            <Ban size={80} />
                          </div>
                        )}
                        
                        {/* Background subtle color */}
                        <div className={`absolute inset-0 opacity-5 pointer-events-none ${
                          isAvailable ? 'bg-[hsl(var(--available))]' : 
                          isBooked ? 'bg-[hsl(var(--booked))]' : 
                          'bg-muted'
                        }`} />
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}