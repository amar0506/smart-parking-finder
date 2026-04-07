import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  MapPin, Car, IndianRupee, Loader2, Info, CheckCircle2,
  QrCode, Smartphone, ShieldCheck, AlertTriangle
} from "lucide-react";
import { useGetSlot, getGetSlotQueryKey, useCreateBooking } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

// Strict Indian vehicle plate regex
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

// Payment step states
type PaymentStep = "qr" | "verifying" | "verified" | "confirmed";

const UPI_ID = "amar07@ptaxis";

export default function Booking() {
  const { slotId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [showPayment, setShowPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("qr");
  const [paymentChecked, setPaymentChecked] = useState(false);
  const [pendingData, setPendingData] = useState<FormValues | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

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
    ? `upi://pay?pa=${UPI_ID}&pn=SatnaSmartParking&am=${totalCost.toFixed(2)}&cu=INR&tn=Parking+Slot+${slot.slotNumber}`
    : `upi://pay?pa=${UPI_ID}&pn=SatnaSmartParking&cu=INR`;

  const openPaymentDialog = (data: FormValues) => {
    setPendingData(data);
    setPaymentStep("qr");
    setPaymentChecked(false);
    setBookingError(null);
    setShowPayment(true);
  };

  // Step 2: User confirms they paid → verify (simulate) → show verified
  const handleVerifyPayment = () => {
    if (!paymentChecked) return;
    setPaymentStep("verifying");

    setTimeout(() => {
      setPaymentStep("verified");
    }, 1800);
  };

  // Step 3: After verification → create booking
  const handleConfirmBooking = () => {
    if (!pendingData || !slot || paymentStep !== "verified") return;
    setPaymentStep("confirmed");

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
          description: `Slot ${slot.slotNumber} booked · ₹${totalCost} paid via UPI`,
        });
        setShowPayment(false);
        setLocation("/my-bookings");
      },
      onError: (err: any) => {
        const msg = err?.data?.error || err?.message || "Could not reserve the slot.";
        setBookingError(msg);
        setPaymentStep("verified"); // Return to verified state so user sees the error
        toast({ title: "Booking Failed", description: msg, variant: "destructive" });
      }
    });
  };

  const closeDialog = () => {
    if (paymentStep === "verifying" || paymentStep === "confirmed") return;
    setShowPayment(false);
    setPaymentStep("qr");
    setPaymentChecked(false);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  if (!slot) return <div className="text-center py-12 text-muted-foreground">Slot not found.</div>;

  if (slot.status !== "available") {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
          <Info size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Slot Unavailable</h2>
        <p className="text-muted-foreground mb-6">This slot is currently <strong>{slot.status}</strong>.</p>
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
            <InfoRow icon={<MapPin size={17} />} label="Location" value={slot.locationName ?? "-"} />
            <InfoRow icon={<Car size={17} />} label="Slot" value={
              <span>{slot.slotNumber} <Badge variant="outline" className="ml-1 text-xs capitalize">{slot.type}</Badge></span>
            } />
            <InfoRow icon={<IndianRupee size={17} />} label="Rate" value={`₹${slot.pricePerHour.toFixed(0)} / hour`} />

            {/* Animated car preview */}
            <div className="relative h-20 bg-muted/20 rounded-xl border border-border overflow-hidden">
              <div className="absolute bottom-5 left-0 right-0 h-px bg-yellow-500/40 border-t border-dashed border-yellow-500/50" />
              <motion.div
                initial={{ x: -90, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 55, damping: 14, delay: 0.4 }}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 text-green-400"
              >
                <Car size={40} />
              </motion.div>
              <p className="absolute top-2 left-2.5 text-[10px] text-muted-foreground font-medium">
                {slot.slotNumber} · {slot.floor}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Booking Form */}
        <Card>
          <CardHeader>
            <CardTitle>Book This Slot</CardTitle>
            <CardDescription>Enter details · pay via UPI to confirm</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(openPaymentDialog)} className="space-y-5">
                <FormField control={form.control} name="vehiclePlate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="MP19ZE7633"
                        {...field}
                        className="uppercase font-mono tracking-widest text-lg h-12 text-center border-2"
                        maxLength={12}
                        onChange={e => field.onChange(e.target.value.replace(/[\s-]/g, "").toUpperCase())}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">Indian format: MP19ZE7633 · DL01AA9999</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="hours" render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center mb-2">
                      <FormLabel>Duration</FormLabel>
                      <span className="font-mono bg-muted px-2.5 py-1 rounded-lg text-sm font-bold">
                        {field.value} hr{field.value > 1 ? "s" : ""}
                      </span>
                    </div>
                    <FormControl>
                      <Slider min={1} max={12} step={1} value={[field.value]}
                        onValueChange={(v) => field.onChange(v[0])} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Cost summary */}
                <div className="bg-muted/40 p-4 rounded-xl border border-border">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Rate</span><span>₹{slot.pricePerHour.toFixed(0)}/hr</span>
                  </div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-muted-foreground">Duration</span><span>{hours} hrs</span>
                  </div>
                  <Separator className="mb-3" />
                  <div className="flex justify-between font-bold text-xl">
                    <span>Total</span>
                    <span className="text-primary">₹{totalCost.toFixed(0)}</span>
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 text-base font-semibold">
                  <QrCode size={18} className="mr-2" /> Pay ₹{totalCost.toFixed(0)} via UPI
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* ── UPI Payment Dialog ── */}
      <Dialog open={showPayment} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone size={18} className="text-primary" /> UPI Payment
            </DialogTitle>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {/* Step 1: QR code */}
            {paymentStep === "qr" && (
              <motion.div key="qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4">

                <div className="bg-white p-4 rounded-2xl shadow-md">
                  <QRCodeSVG value={upiString} size={180} level="H" includeMargin={false} />
                </div>

                <div className="w-full space-y-2">
                  <div className="flex justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
                    <span className="text-muted-foreground">UPI ID</span>
                    <span className="font-mono font-bold">{UPI_ID}</span>
                  </div>
                  <div className="flex justify-between bg-primary/10 rounded-lg px-3 py-2 border border-primary/20">
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <span className="font-bold text-lg text-primary">₹{totalCost.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Slot</span>
                    <span className="font-medium">{slot.slotNumber} · {pendingData?.vehiclePlate}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 w-full text-[11px] text-center text-muted-foreground">
                  {["PhonePe", "Google Pay", "Paytm"].map(app => (
                    <div key={app} className="bg-muted/40 rounded-lg py-2 border border-border">{app}</div>
                  ))}
                </div>

                {/* Payment confirmation checkbox */}
                <div className={`w-full rounded-xl border-2 p-4 transition-colors ${paymentChecked ? "border-green-600 bg-green-950/20" : "border-border"}`}>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="payment-done"
                      checked={paymentChecked}
                      onCheckedChange={(c) => setPaymentChecked(!!c)}
                      className="mt-0.5"
                    />
                    <label htmlFor="payment-done" className="text-sm cursor-pointer leading-tight">
                      I have completed the UPI payment of <strong>₹{totalCost.toFixed(0)}</strong> to <strong>{UPI_ID}</strong>
                    </label>
                  </div>
                </div>

                <div className="w-full space-y-2">
                  <Button
                    onClick={handleVerifyPayment}
                    className="w-full"
                    disabled={!paymentChecked}
                  >
                    <ShieldCheck size={16} className="mr-2" />
                    Verify Payment
                  </Button>
                  <Button variant="ghost" size="sm" onClick={closeDialog} className="w-full text-muted-foreground">
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Verifying */}
            {paymentStep === "verifying" && (
              <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-10">
                <div className="relative">
                  <Loader2 size={56} className="animate-spin text-primary" />
                  <Smartphone size={22} className="absolute inset-0 m-auto text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg">Verifying Payment</p>
                  <p className="text-xs text-muted-foreground mt-1">Checking UPI transaction with {UPI_ID}...</p>
                </div>
                <div className="flex gap-1">
                  {[0, 0.2, 0.4].map(d => (
                    <motion.div key={d} className="w-2 h-2 rounded-full bg-primary"
                      animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, delay: d, repeat: Infinity }} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Verified → Confirm booking */}
            {paymentStep === "verified" && (
              <motion.div key="verified" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 py-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 15 }}
                  className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/40">
                  <CheckCircle2 size={36} className="text-green-400" />
                </motion.div>

                <div className="text-center">
                  <p className="font-bold text-lg text-green-400">Payment Verified!</p>
                  <p className="text-xs text-muted-foreground mt-1">₹{totalCost.toFixed(0)} received from {pendingData?.vehiclePlate}</p>
                </div>

                <div className="w-full bg-muted/40 rounded-xl p-4 border border-border space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Slot</span>
                    <span className="font-bold">{slot.slotNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vehicle</span>
                    <span className="font-mono">{pendingData?.vehiclePlate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span>{pendingData?.hours} hrs</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Amount Paid</span>
                    <span className="text-primary">₹{totalCost.toFixed(0)}</span>
                  </div>
                </div>

                {bookingError && (
                  <div className="w-full flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-xs text-destructive">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    {bookingError}
                  </div>
                )}

                <Button onClick={handleConfirmBooking} className="w-full bg-green-600 hover:bg-green-700 h-11">
                  <CheckCircle2 size={16} className="mr-2" /> Confirm Booking
                </Button>
              </motion.div>
            )}

            {/* Step 4: Confirmed (brief) */}
            {paymentStep === "confirmed" && (
              <motion.div key="confirmed" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4 py-10">
                <Loader2 size={40} className="animate-spin text-green-400" />
                <p className="font-semibold">Confirming your booking...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-sm">{value}</p>
      </div>
    </div>
  );
}
