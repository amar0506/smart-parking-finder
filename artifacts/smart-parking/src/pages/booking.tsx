import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Clock, MapPin, Car, IndianRupee, Loader2, Info, CheckCircle2, QrCode, Smartphone } from "lucide-react";
import { useGetSlot, getGetSlotQueryKey, useCreateBooking } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

// Indian vehicle plate: e.g. MP19ZE7633 or MP 19 ZE 7633
const INDIAN_PLATE_REGEX = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/;

const formSchema = z.object({
  vehiclePlate: z
    .string()
    .min(2, "Plate is required")
    .transform(v => v.replace(/\s+/g, "").toUpperCase())
    .refine(v => INDIAN_PLATE_REGEX.test(v), {
      message: "Enter valid Indian plate (e.g. MP19ZE7633)",
    }),
  hours: z.number().min(1).max(24),
});

type FormValues = z.infer<typeof formSchema>;

export default function Booking() {
  const { slotId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPayment, setShowPayment] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [pendingData, setPendingData] = useState<FormValues | null>(null);

  const parsedSlotId = slotId ? parseInt(slotId) : 0;

  const { data: slot, isLoading: isSlotLoading } = useGetSlot(parsedSlotId, {
    query: { enabled: !!parsedSlotId, queryKey: getGetSlotQueryKey(parsedSlotId) }
  });

  const createBooking = useCreateBooking();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { vehiclePlate: "", hours: 2 },
  });

  const hours = form.watch("hours");
  const totalCost = slot ? slot.pricePerHour * hours : 0;

  const upiId = "satnaparking@upi";
  const upiString = slot
    ? `upi://pay?pa=${upiId}&pn=SatnaSmartParking&am=${totalCost.toFixed(2)}&cu=INR&tn=ParkingSlot${slot.slotNumber}`
    : "";

  const onSubmit = (data: FormValues) => {
    setPendingData(data);
    setShowPayment(true);
  };

  const handlePaymentConfirm = () => {
    if (!pendingData || !slot) return;
    setPaymentDone(true);

    setTimeout(() => {
      createBooking.mutate({
        data: {
          slotId: slot.id,
          hours: pendingData.hours,
          vehiclePlate: pendingData.vehiclePlate,
        }
      }, {
        onSuccess: () => {
          toast({ title: "Booking Confirmed!", description: `Slot ${slot.slotNumber} booked. Payment of ₹${totalCost} received.` });
          setShowPayment(false);
          setLocation("/my-bookings");
        },
        onError: (err: any) => {
          toast({
            title: "Booking Failed",
            description: err.message || err.data?.error || "Could not reserve the slot.",
            variant: "destructive"
          });
          setShowPayment(false);
          setPaymentDone(false);
        }
      });
    }, 1500);
  };

  if (isSlotLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  if (!slot) return <div className="text-center py-12">Slot not found.</div>;

  if (slot.status !== "available") {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
          <Info size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Slot Unavailable</h2>
        <p className="text-muted-foreground mb-6">This slot is currently {slot.status}.</p>
        <Button onClick={() => setLocation("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <Button variant="ghost" className="mb-4" onClick={() => setLocation("/dashboard")}>
          ← Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Reserve Parking</h1>
        <p className="text-muted-foreground mt-1">Satna Smart City Parking · MP</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Slot Info */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Slot Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium text-sm">{slot.locationName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                <Car size={20} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Slot</p>
                <p className="font-medium">{slot.slotNumber}
                  <Badge variant="outline" className="ml-2 text-xs">{slot.type}</Badge>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                <IndianRupee size={20} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rate</p>
                <p className="font-medium">₹{slot.pricePerHour.toFixed(0)} / hour</p>
              </div>
            </div>

            {/* Car entry animation */}
            <div className="relative h-20 bg-muted/20 rounded-lg border border-border overflow-hidden mt-2">
              <div className="absolute inset-0 flex items-end justify-center pb-2">
                <div className="w-full h-1.5 bg-yellow-500/30 absolute bottom-6 left-0 right-0 border-t border-yellow-500/20 border-dashed" />
                <motion.div
                  initial={{ x: -80 }}
                  animate={{ x: 0 }}
                  transition={{ type: "spring", stiffness: 60, damping: 15, delay: 0.3 }}
                  className="text-green-400"
                >
                  <Car size={36} />
                </motion.div>
              </div>
              <div className="absolute top-2 left-2 text-[10px] text-muted-foreground">Slot Preview</div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Form */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Booking Form</CardTitle>
            <CardDescription>Enter your vehicle details</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="vehiclePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Number Plate</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="MP19ZE7633"
                          {...field}
                          className="uppercase font-mono tracking-widest text-lg h-12"
                          onChange={e => field.onChange(e.target.value.replace(/\s+/g, "").toUpperCase())}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">Indian format: MP19ZE7633</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hours"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center mb-3">
                        <FormLabel>Duration</FormLabel>
                        <span className="font-mono bg-muted px-2 py-1 rounded text-sm">{field.value} Hours</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={1} max={12} step={1}
                          value={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="bg-muted/40 p-4 rounded-lg border border-border">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Rate</span>
                    <span>₹{slot.pricePerHour.toFixed(0)} / hr</span>
                  </div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-muted-foreground">Duration</span>
                    <span>{hours} hrs</span>
                  </div>
                  <Separator className="mb-3" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">₹{totalCost.toFixed(0)}</span>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11" disabled={createBooking.isPending}>
                  {createBooking.isPending
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <><QrCode size={16} className="mr-2" /> Pay with UPI</>
                  }
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* UPI Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={(o) => { if (!o && !paymentDone) { setShowPayment(false); setPaymentDone(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone size={20} className="text-primary" /> UPI Payment
            </DialogTitle>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {!paymentDone ? (
              <motion.div
                key="qr"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-4"
              >
                <div className="bg-white p-4 rounded-xl shadow-inner">
                  <QRCodeSVG
                    value={upiString || "upi://pay?pa=satnaparking@upi"}
                    size={180}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-semibold text-lg">₹{totalCost.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">UPI ID: <span className="font-mono text-foreground">{upiId}</span></p>
                  <p className="text-xs text-muted-foreground">Slot: {slot.slotNumber} • {pendingData?.vehiclePlate}</p>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                    {["PhonePe", "Google Pay", "Paytm"].map(app => (
                      <div key={app} className="bg-muted/50 rounded-lg py-2 border border-border">
                        {app}
                      </div>
                    ))}
                  </div>
                  <Button onClick={handlePaymentConfirm} className="w-full mt-2 bg-green-600 hover:bg-green-700">
                    <CheckCircle2 size={16} className="mr-2" /> Payment Done
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowPayment(false)} className="text-muted-foreground">
                    Cancel
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center"
                >
                  <CheckCircle2 size={40} className="text-green-400" />
                </motion.div>
                <p className="font-bold text-lg">Processing Booking...</p>
                <Loader2 className="animate-spin text-muted-foreground" size={20} />
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
