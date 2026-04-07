import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, MapPin, BatteryCharging, Accessibility, Shrink, Ban,
  Sparkles, ChevronRight, IndianRupee
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

  const aiSuggestion = useMemo(() => {
    if (!slots) return null;
    const available = slots.filter(s => s.status === "available");
    if (available.length === 0) return null;
    return available[0];
  }, [slots]);

  const getSlotTypeIcon = (type: string) => {
    switch (type) {
      case "electric": return <BatteryCharging size={14} className="text-blue-400" />;
      case "handicap": return <Accessibility size={14} className="text-purple-400" />;
      case "compact": return <Shrink size={14} className="text-yellow-400" />;
      default: return null;
    }
  };

  const utilization = summary?.totalSlots
    ? Math.round((summary.bookedSlots / summary.totalSlots) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Satna Smart Parking
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Real-time slot availability · Madhya Pradesh, India
          </p>
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
          { label: "Total Slots", value: summary?.totalSlots ?? 0, color: "text-foreground" },
          { label: "Available", value: summary?.availableSlots ?? 0, color: "text-green-400" },
          { label: "Booked", value: summary?.bookedSlots ?? 0, color: "text-red-400" },
          { label: "Utilization", value: `${utilization}%`, color: "text-blue-400" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {isSummaryLoading
                ? <Skeleton className="h-8 w-16" />
                : <div className={`text-2xl md:text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              }
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Suggestion Banner */}
      {aiSuggestion && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-gradient-to-r from-blue-900/50 to-indigo-900/40 border border-blue-700/40 rounded-xl px-4 py-3"
        >
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-300">AI Recommendation</p>
            <p className="text-xs text-muted-foreground truncate">
              Nearest available slot:{" "}
              <span className="text-green-400 font-bold">{aiSuggestion.slotNumber}</span>
              {" "}at{" "}
              <span className="text-blue-300">{aiSuggestion.locationName}</span>
              {" "}· ₹{aiSuggestion.pricePerHour}/hr
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-blue-700/50 text-blue-300 hover:bg-blue-900/50 text-xs h-7"
            onClick={() => setLocation(`/booking/${aiSuggestion.id}`)}
          >
            Book <ChevronRight size={12} className="ml-1" />
          </Button>
        </motion.div>
      )}

      {/* Tabs: Grid vs 3D */}
      <Tabs defaultValue="grid" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="grid">Slot Grid</TabsTrigger>
          <TabsTrigger value="3d">3D View</TabsTrigger>
        </TabsList>

        {/* 2D Grid Tab */}
        <TabsContent value="grid" className="mt-4">
          {isSlotsLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : slots?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border border-border">
              No slots found for this location.
            </div>
          ) : (
            <>
              {/* Legend */}
              <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/70 inline-block" /> Available</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/70 inline-block" /> Booked</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500/70 inline-block" /> Maintenance</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
                <AnimatePresence>
                  {slots?.map((slot, index) => {
                    const isAvailable = slot.status === "available";
                    const isBooked = slot.status === "booked";
                    const isMaintenance = slot.status === "maintenance";

                    return (
                      <motion.div
                        key={slot.id}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.15, delay: index * 0.015 }}
                        whileHover={isAvailable ? { scale: 1.04 } : {}}
                      >
                        <Card
                          className={`relative overflow-hidden cursor-pointer transition-all duration-200 border-2 ${
                            isAvailable
                              ? "border-green-500/50 bg-green-950/20 hover:bg-green-900/30 hover:shadow-green-900/30 hover:shadow-lg"
                              : isBooked
                              ? "border-red-500/40 bg-red-950/20 cursor-not-allowed"
                              : "border-yellow-700/30 bg-yellow-950/10 cursor-not-allowed opacity-60"
                          }`}
                          onClick={() => { if (isAvailable) setLocation(`/booking/${slot.id}`); }}
                        >
                          <CardContent className="p-2 md:p-3 h-24 md:h-28 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-sm md:text-base leading-tight">{slot.slotNumber}</span>
                              {getSlotTypeIcon(slot.type)}
                            </div>

                            <div className="text-center">
                              {isBooked && (
                                <motion.div
                                  initial={{ x: -20, opacity: 0 }}
                                  animate={{ x: 0, opacity: 1 }}
                                  transition={{ delay: index * 0.02 + 0.2 }}
                                  className="text-red-400"
                                >
                                  <Car size={28} className="mx-auto" />
                                </motion.div>
                              )}
                              {isAvailable && (
                                <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto">
                                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                </div>
                              )}
                              {isMaintenance && (
                                <Ban size={22} className="mx-auto text-yellow-600 opacity-60" />
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">{slot.floor?.replace("Floor ", "Fl.")}</span>
                              <div className={`w-2 h-2 rounded-full ${
                                isAvailable ? "bg-green-400" : isBooked ? "bg-red-400" : "bg-yellow-500"
                              }`} />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </>
          )}
        </TabsContent>

        {/* 3D Tab */}
        <TabsContent value="3d" className="mt-4">
          <div className="w-full h-[340px] md:h-[480px] rounded-xl border border-border overflow-hidden relative bg-[#0a0a1a]">
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-medium text-green-300">Live 3D Visualization</span>
            </div>
            <div className="absolute bottom-3 left-3 z-10 text-xs text-muted-foreground bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full border border-border/50">
              Click green slot to book
            </div>
            {slots && slots.length > 0 ? (
              <Parking3D
                slots={slots}
                onSlotClick={(id) => setLocation(`/booking/${id}`)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Select a location to see 3D view
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
