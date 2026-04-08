import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, BatteryCharging, Accessibility, Shrink, Ban,
  Sparkles, ChevronRight, ParkingSquare, Zap
} from "lucide-react";
import {
  useGetLocations, useGetSlots, useGetDashboardSummary
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Parking3D from "@/components/parking-3d";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: locations } = useGetLocations();
  const { data: slots, isLoading: isSlotsLoading } = useGetSlots(
    { locationId: selectedLocationId },
    { query: { enabled: true } }
  );

  // Group slots by floor
  const slotsByFloor = useMemo(() => {
    if (!slots) return new Map<string, typeof slots>();
    const map = new Map<string, typeof slots>();
    slots.forEach(s => {
      if (!map.has(s.floor)) map.set(s.floor, []);
      map.get(s.floor)!.push(s);
    });
    return map;
  }, [slots]);

  const aiSuggestion = useMemo(() => {
    if (!slots) return null;
    return slots.find(s => s.status === "available") ?? null;
  }, [slots]);

  const getTypeIcon = (type: string, size = 13) => {
    switch (type) {
      case "electric":  return <BatteryCharging size={size} className="text-blue-400" />;
      case "handicap":  return <Accessibility size={size} className="text-purple-400" />;
      case "compact":   return <Shrink size={size} className="text-amber-400" />;
      default: return null;
    }
  };

  const utilization = summary?.totalSlots
    ? Math.round((summary.bookedSlots / summary.totalSlots) * 100) : 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Satna Smart Parking</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Real-time slot availability · Madhya Pradesh, India</p>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Slots", value: summary?.totalSlots ?? 0, color: "text-foreground", bg: "" },
          { label: "Available", value: summary?.availableSlots ?? 0, color: "text-green-400", bg: "bg-green-950/20" },
          { label: "Booked", value: summary?.bookedSlots ?? 0, color: "text-red-400", bg: "bg-red-950/20" },
          { label: "Utilization", value: `${utilization}%`, color: "text-blue-400", bg: "bg-blue-950/20" },
        ].map((stat) => (
          <Card key={stat.label} className={`${stat.bg}`}>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {isSummaryLoading
                ? <Skeleton className="h-8 w-16" />
                : <div className={`text-2xl md:text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              }
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Suggestion */}
      {aiSuggestion && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-gradient-to-r from-blue-950/60 to-indigo-950/40 border border-blue-700/30 rounded-xl px-4 py-3"
        >
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
            <Sparkles size={15} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-300">AI Recommendation</p>
            <p className="text-xs text-muted-foreground">
              Nearest available: <span className="text-green-400 font-bold">{aiSuggestion.slotNumber}</span>
              {" "}· <span className="text-blue-300">{aiSuggestion.locationName}</span>
              {" "}· ₹{aiSuggestion.pricePerHour}/hr
            </p>
          </div>
          <Button size="sm" variant="outline"
            className="shrink-0 border-blue-700/40 text-blue-300 hover:bg-blue-900/30 text-xs h-7"
            onClick={() => setLocation(`/booking/${aiSuggestion.id}`)}>
            Book <ChevronRight size={11} className="ml-0.5" />
          </Button>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="grid" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="grid" className="text-sm"><ParkingSquare size={14} className="mr-1.5" />Slot Grid</TabsTrigger>
          <TabsTrigger value="3d" className="text-sm"><Zap size={14} className="mr-1.5" />3D View</TabsTrigger>
        </TabsList>

        {/* ── GRID TAB ── */}
        <TabsContent value="grid" className="mt-4">
          {isSlotsLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : !slots || slots.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
              <ParkingSquare size={40} className="mx-auto mb-3 opacity-40" />
              No slots found for this location.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500" />Available — click to book</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500" />Booked</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-500" />Maintenance</span>
              </div>

              {/* Slots grouped by floor */}
              {Array.from(slotsByFloor.entries()).map(([floor, floorSlots]) => (
                <div key={floor}>
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{floor}</h3>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {floorSlots.filter(s => s.status === "available").length} free
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                    <AnimatePresence>
                      {floorSlots.map((slot, index) => {
                        const isAvailable = slot.status === "available";
                        const isBooked = slot.status === "booked";
                        const isMaintenance = slot.status === "maintenance";

                        return (
                          <motion.div
                            key={slot.id}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.12, delay: index * 0.012 }}
                            whileHover={isAvailable ? { scale: 1.05, y: -2 } : {}}
                          >
                            <div
                              className={`
                                relative rounded-xl border-2 overflow-hidden h-24 md:h-28
                                flex flex-col justify-between p-2.5 transition-all duration-150
                                <div className="text-[10px] text-gray-400">
                                Satna Smart Parking
                                </div>
                                ${isAvailable
                                  ? "border-green-500/60 bg-green-950/25 cursor-pointer hover:border-green-400 hover:bg-green-900/35 hover:shadow-lg hover:shadow-green-900/20"
                                  : isBooked
                                  ? "border-red-500/40 bg-red-950/25 cursor-not-allowed"
                                  : "border-yellow-600/30 bg-yellow-950/15 cursor-not-allowed opacity-70"
                                }
                              `}
                              onClick={() => { if (isAvailable) setLocation(`/booking/${slot.id}`); }}
                              title={isAvailable ? `Book ${slot.slotNumber}` : `${slot.slotNumber} — ${slot.status}`}
                            >
                              {/* Top: Slot ID + type icon */}
                              <div className="flex items-start justify-between">
                                <span className="font-bold text-sm md:text-base leading-none">{slot.slotNumber}</span>
                                <div className="shrink-0">{getTypeIcon(slot.type)}</div>
                              </div>

                              {/* Center: status visual */}
                              <div className="flex items-center justify-center flex-1 py-1">
                                {isBooked && (
                                  <motion.div
                                    initial={{ x: -16, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: index * 0.015 + 0.15 }}
                                    className="text-red-400"
                                  >
                                    <Car size={26} />
                                  </motion.div>
                                )}
                                {isAvailable && (
                                  <div className="w-5 h-5 rounded-full border-2 border-green-500/60 bg-green-500/10 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                  </div>
                                )}
                                {isMaintenance && <Ban size={20} className="text-yellow-600 opacity-70" />}
                              </div>

                              {/* Bottom: status dot */}
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  {isAvailable ? "OPEN" : isBooked ? "FULL" : "MAINT"}
                                </span>
                                <div className={`w-2 h-2 rounded-full ${
                                  isAvailable ? "bg-green-400 animate-pulse" :
                                  isBooked ? "bg-red-400" : "bg-yellow-500"
                                }`} />
                              </div>

                              {/* Subtle background tint */}
                              <div className={`absolute inset-0 opacity-[0.04] pointer-events-none ${
                                isAvailable ? "bg-green-400" : isBooked ? "bg-red-400" : "bg-yellow-500"
                              }`} />
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── 3D TAB ── */}
        <TabsContent value="3d" className="mt-4">
          <div className="w-full h-[360px] md:h-[500px] rounded-xl border border-border overflow-hidden relative bg-[#080c1a]">
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10 pointer-events-none">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-medium text-green-300">Live 3D View</span>
            </div>
            <div className="absolute top-3 right-3 z-10 text-xs text-muted-foreground bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10 pointer-events-none">
              Drag · Scroll zoom · Click green to book
            </div>

            {slots && slots.length > 0 ? (
              <Parking3D slots={slots} onSlotClick={(id) => setLocation(`/booking/${id}`)} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <ParkingSquare size={40} className="opacity-30" />
                <p className="text-sm">Select a location to view 3D parking</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
