import { useState } from "react";
import { format } from "date-fns";
import { Car, Clock, MapPin, XCircle, CheckCircle2, Loader2, Ban, ShieldX, IndianRupee } from "lucide-react";
import { useGetBookings, useCancelBooking, getGetBookingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";

export default function MyBookings() {
  const { data: bookings, isLoading } = useGetBookings();
  const cancelBooking = useCancelBooking();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [cancelId, setCancelId] = useState<number | null>(null);

  const handleCancel = () => {
    if (!cancelId) return;
    cancelBooking.mutate({ id: cancelId }, {
      onSuccess: () => {
        toast({ title: "Booking Cancelled", description: "Your parking reservation has been cancelled." });
        queryClient.invalidateQueries({ queryKey: getGetBookingsQueryKey() });
        setCancelId(null);
      },
      onError: (err: any) => {
        toast({ title: "Cancellation Failed", description: err.message || "Could not cancel booking.", variant: "destructive" });
        setCancelId(null);
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-blue-600 hover:bg-blue-600"><Clock size={11} className="mr-1" /> Active</Badge>;
      case "completed":
        return <Badge variant="outline" className="text-green-400 border-green-600"><CheckCircle2 size={11} className="mr-1" /> Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="text-muted-foreground border-muted"><Ban size={11} className="mr-1" /> Cancelled</Badge>;
      case "cancelled_by_admin":
        return <Badge variant="outline" className="text-red-400 border-red-700"><ShieldX size={11} className="mr-1" /> Cancelled by Admin</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Your parking history and active reservations.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      ) : bookings?.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Car size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">No bookings yet</h2>
          <p className="text-muted-foreground text-sm">Your parking history will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {bookings?.map((booking) => {
              const isCancelled = booking.status === "cancelled" || booking.status === "cancelled_by_admin";
              return (
                <motion.div key={booking.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <Card className={`overflow-hidden border-l-4 ${
                    booking.status === "active" ? "border-l-blue-500" :
                    booking.status === "completed" ? "border-l-green-500" :
                    booking.status === "cancelled_by_admin" ? "border-l-red-600" :
                    "border-l-muted"
                  } ${isCancelled ? "opacity-70" : ""}`}>
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        <div className="p-5 flex-1">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-bold text-base">{booking.locationName}</h3>
                              <p className="text-xs text-muted-foreground flex items-center mt-0.5">
                                <MapPin size={11} className="mr-1" />
                                Slot {booking.slotNumber} · {booking.floor}
                              </p>
                            </div>
                            {getStatusBadge(booking.status)}
                          </div>

                          {booking.status === "cancelled_by_admin" && (
                            <div className="bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2 mb-3 text-xs text-red-400">
                              This booking was cancelled by an administrator.
                            </div>
                          )}

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Vehicle</p>
                              <p className="font-mono text-sm bg-muted/50 inline-block px-2 py-0.5 rounded">{booking.vehiclePlate}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Date</p>
                              <p className="text-sm font-medium">{format(new Date(booking.startTime), "d MMM yyyy")}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Time</p>
                              <p className="text-sm font-medium">{format(new Date(booking.startTime), "h:mm a")} – {format(new Date(booking.endTime), "h:mm a")}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Amount Paid</p>
                              <p className="text-sm font-bold text-primary flex items-center">
                                <IndianRupee size={12} className="mr-0.5" />{booking.totalCost.toFixed(0)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {booking.status === "active" && (
                          <div className="bg-muted/30 p-5 flex items-center justify-center border-t md:border-t-0 md:border-l border-border md:w-40">
                            <Button variant="destructive" className="w-full text-sm"
                              onClick={() => setCancelId(booking.id)} disabled={cancelBooking.isPending}>
                              <XCircle size={14} className="mr-1" /> Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <AlertDialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Reservation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this parking reservation? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {cancelBooking.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "Yes, cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
