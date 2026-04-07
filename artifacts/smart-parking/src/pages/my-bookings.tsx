import { useState } from "react";
import { format } from "date-fns";
import { Car, Clock, MapPin, XCircle, CheckCircle2, Loader2, Ban } from "lucide-react";
import { useGetBookings, useCancelBooking, getGetBookingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
    
    cancelBooking.mutate(
      { id: cancelId },
      {
        onSuccess: () => {
          toast({ title: "Booking Cancelled", description: "Your parking reservation has been cancelled." });
          queryClient.invalidateQueries({ queryKey: getGetBookingsQueryKey() });
          setCancelId(null);
        },
        onError: (err: any) => {
          toast({ 
            title: "Cancellation Failed", 
            description: err.message || "Could not cancel booking.", 
            variant: "destructive" 
          });
          setCancelId(null);
        }
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "active": return <Badge className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] text-primary-foreground"><Clock size={12} className="mr-1"/> Active</Badge>;
      case "completed": return <Badge variant="outline" className="text-[hsl(var(--available))] border-[hsl(var(--available))]"><CheckCircle2 size={12} className="mr-1"/> Completed</Badge>;
      case "cancelled": return <Badge variant="outline" className="text-[hsl(var(--muted-foreground))] border-[hsl(var(--muted-foreground))]"><Ban size={12} className="mr-1"/> Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">My Bookings</h1>
        <p className="text-muted-foreground mt-1">Manage your active and past parking reservations.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      ) : bookings?.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Car size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">No bookings yet</h2>
          <p className="text-muted-foreground">Your parking history will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {bookings?.map((booking) => (
              <motion.div
                key={booking.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className={`overflow-hidden border-l-4 ${
                  booking.status === 'active' ? 'border-l-[hsl(var(--primary))]' : 
                  booking.status === 'completed' ? 'border-l-[hsl(var(--available))]' : 
                  'border-l-muted'
                }`}>
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-lg">{booking.locationName}</h3>
                            <p className="text-sm text-muted-foreground flex items-center mt-1">
                              <MapPin size={14} className="mr-1" />
                              Slot {booking.slotNumber} • Floor {booking.floor}
                            </p>
                          </div>
                          {getStatusBadge(booking.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Vehicle Plate</p>
                            <p className="font-mono text-sm bg-muted/50 inline-block px-2 py-1 rounded">{booking.vehiclePlate}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Date</p>
                            <p className="text-sm font-medium">{format(new Date(booking.startTime), "MMM d, yyyy")}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Time</p>
                            <p className="text-sm font-medium">{format(new Date(booking.startTime), "h:mm a")} - {format(new Date(booking.endTime), "h:mm a")}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
                            <p className="text-sm font-bold text-primary">₹{booking.totalCost.toFixed(0)}</p>
                          </div>
                        </div>
                      </div>
                      
                      {booking.status === "active" && (
                        <div className="bg-muted/30 p-6 flex items-center justify-center md:border-l md:border-t-0 border-t border-border md:w-48">
                          <Button 
                            variant="destructive" 
                            className="w-full"
                            onClick={() => setCancelId(booking.id)}
                            disabled={cancelBooking.isPending}
                          >
                            <XCircle size={16} className="mr-2" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AlertDialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Reservation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this parking reservation? This action cannot be undone.
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