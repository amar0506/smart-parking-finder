import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapPin, Car, IndianRupee, Loader2, Info, CheckCircle2, QrCode, Smartphone, ShieldCheck } from "lucide-react";
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

// Strict Indian vehicle plate: e.g. MP19ZE7633 or DL01AA9999
const PLATE_REGEX = /^[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}$/;

const formSchema = z.object({
  vehiclePlate: z
    .string()
    .min(1, "Vehicle number is required")
    .transform(v => v.replace(/[\s-]/g, "").toUpperCase())
    .refine(v => PLATE_REGEX.test(v), {
      message: "Enter a valid Indian vehicle number (e.g. MP19ZE7633)",
    }),
  hours: z.number().min(1).max(12),
});

type FormValues = z.infer<typeof formSchema>;

const UPI_ID = "amar07@ptaxis";

export default function Booking() {
  const { slotId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPayment, setShowPayment] = useState(false);
  const [paymentVerifying, setPaymentVerifying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [pendingData, setPendingData] = useState<FormValues | null>(null);

  const parsedSlotId = slotId ? parseInt(slotId) : 0;
  const { data: slot, isLoading } = useGetSlot(parsedSlotId, {
    query: { enabled: !!parsedSlotId, queryKey: getGetSlotQueryKey(parsedSlotId) }
  });

  const createBooking = useCreateBooking();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { vehiclePlate: "", hours: 2 },
  });

  const hours = form.watch("hours");
  const totalCost = slot ? slot.pricePerHour * hours : 0;

  const upiString = slot
    ? `upi://pay?pa=${UPI_ID}&pn=SatnaSmartParking&am=${totalCost.toFixed(2)}&cu=INR&tn=Slot${slot.slotNumber}Booking`
    : `upi://pay?pa=${UPI_ID}&pn=SatnaSmartParking&cu=INR`;

  const onSubmit = (data: FormValues) => {
    setPendingData(data);
    setShowPayment(true);
    setPaymentSuccess(false);
    setPaymentVerifying(false);
  };

  const handlePaymentDone = () => {
    if (!pendingData || !slot) return;
    setPaymentVerifying(true);

    // Simulate payment verification (1.5s), then confirm booking
    setTimeout(() => {
      setPaymentVerifying(false);
      setPaymentSuccess(true);

      setTimeout(() => {
        createBooking.mutate({
          data: {
            slotId: slot.id,
            hours: pendingData.hours,
            vehiclePlate: pendingData.vehiclePlate,
          }
        }, {
          onSuccess: () => {
            toast({
              title: "Booking Confirmed!",
              description: `Slot ${slot.slotNumber} booked. Payment of ₹${totalCost} received via UPI.`,
            });
            setShowPayment(false);
            setLocation("/my-bookings");
          },
          onError: (err: any) => {
            toast({
              title: "Booking Failed",
              description: err.message || err.data?.error || "Could not reserve the slot.",
              variant: "destructive",
            });
            setShowPayment(false);
            setPaymentSuccess(false);
          }
        });
      }, 800);
    }, 1600);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

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
        <p className="text-muted-foreground mt-1 text-sm">Satna Smart City Parking · Madhya Pradesh</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Slot Info */}
        <Card>
          <CardHeader><CardTitle>Slot Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium text-sm">{slot.locationName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Car size={18} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Slot</p>
                <p className="font-medium">{slot.slotNumber}
                  <Badge variant="outline" className="ml-2 text-xs capitalize">{slot.type}</Badge>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <IndianRupee size={18} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rate</p>
                <p className="font-medium">₹{slot.pricePerHour.toFixed(0)} / hour</p>
              </div>
            </div>

            {/* Animated car preview */}
            <div className="relative h-20 bg-muted/20 rounded-lg border border-border overflow-hidden">
              <div className="absolute bottom-5 left-0 right-0 h-1 bg-yellow-500/30 border-t border-dashed border-yellow-500/40" />
              <motion.div
                initial={{ x: -90, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 55, damping: 14, delay: 0.4 }}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 text-green-400"
              >
                <Car size={40} />
              </motion.div>
              <p className="absolute top-2 left-2 text-[10px] text-muted-foreground">Slot {slot.slotNumber} · {slot.floor}</p>
            </div>
          </CardContent>
        </Card>

        {/* Booking Form */}
        <Card>
          <CardHeader>
            <CardTitle>Book This Slot</CardTitle>
            <CardDescription>Enter vehicle details and pay via UPI</CardDescription>
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
                          className="uppercase font-mono tracking-widest text-lg h-12 text-center"
                          maxLength={12}
                          onChange={e => field.onChange(e.target.value.replace(/[\s-]/g, "").toUpperCase())}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Indian format only (e.g. MP19ZE7633, DL01AA9999)
                      </FormDescription>
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
                        <FormLabel>Parking Duration</FormLabel>
                        <span className="font-mono bg-muted px-2 py-1 rounded text-sm font-bold">{field.value} hr{field.value > 1 ? "s" : ""}</span>
                      </div>
                      <FormControl>
                        <Slider min={1} max={12} step={1} value={[field.value]}
                          onValueChange={(v) => field.onChange(v[0])} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="bg-muted/40 p-4 rounded-xl border border-border">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Rate</span>
                    <span>₹{slot.pricePerHour.toFixed(0)}/hr</span>
                  </div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-muted-foreground">Duration</span>
                    <span>{hours} hrs</span>
                  </div>
                  <Separator className="mb-3" />
                  <div className="flex justify-between font-bold text-xl">
                    <span>Total</span>
                    <span className="text-primary">₹{totalCost.toFixed(0)}</span>
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 text-base" disabled={createBooking.isPending}>
                  <QrCode size={18} className="mr-2" /> Pay ₹{totalCost.toFixed(0)} via UPI
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* UPI Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={(o) => {
        if (!o && !paymentVerifying && !paymentSuccess) setShowPayment(false);
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone size={18} className="text-primary" /> UPI Payment
            </DialogTitle>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {paymentVerifying ? (
              <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-8">
                <Loader2 size={40} className="animate-spin text-primary" />
                <p className="font-semibold">Verifying Payment...</p>
                <p className="text-xs text-muted-foreground">Please wait while we confirm your UPI transaction</p>
              </motion.div>
            ) : paymentSuccess ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 py-8">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={40} className="text-green-400" />
                </motion.div>
                <p className="font-bold text-lg text-green-400">Payment Successful!</p>
                <p className="text-sm text-muted-foreground">Confirming your booking...</p>
              </motion.div>
            ) : (
              <motion.div key="qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-2">

                {/* QR Code */}
                <div className="bg-white p-4 rounded-2xl shadow-lg">
                  <QRCodeSVG
                    value={upiString}
                    size={190}
                    level="H"
                    includeMargin={false}
                    imageSettings={{
                      src: "",
                      height: 0,
                      width: 0,
                      excavate: false,
                    }}
                  />
                </div>

                {/* Payment details */}
                <div className="w-full space-y-2">
                  <div className="flex justify-between items-center bg-muted/50 rounded-lg px-3 py-2">
                    <span className="text-xs text-muted-foreground">UPI ID</span>
                    <span className="font-mono text-sm font-bold">{UPI_ID}</span>
                  </div>
                  <div className="flex justify-between items-center bg-primary/10 rounded-lg px-3 py-2 border border-primary/20">
                    <span className="text-xs text-muted-foreground">Amount</span>
                    <span className="font-bold text-lg text-primary">₹{totalCost.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-muted/50 rounded-lg px-3 py-2">
                    <span className="text-xs text-muted-foreground">For</span>
                    <span className="text-xs font-medium">Slot {slot.slotNumber} · {pendingData?.vehiclePlate}</span>
                  </div>
                </div>

                {/* UPI Apps */}
                <div className="grid grid-cols-3 gap-2 w-full text-center text-xs text-muted-foreground">
                  {["PhonePe", "Google Pay", "Paytm"].map(app => (
                    <div key={app} className="bg-muted/40 rounded-lg py-2 px-1 border border-border">
                      {app}
                    </div>
                  ))}
                </div>

                <div className="w-full space-y-2">
                  <Button onClick={handlePaymentDone} className="w-full bg-green-600 hover:bg-green-700">
                    <ShieldCheck size={16} className="mr-2" /> Payment Done — Confirm Booking
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowPayment(false)} className="w-full text-muted-foreground">
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
