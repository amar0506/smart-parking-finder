import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Clock, MapPin, Car, CreditCard, Loader2, Info } from "lucide-react";
import { useGetSlot, getGetSlotQueryKey, useCreateBooking } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const formSchema = z.object({
  vehiclePlate: z.string().min(2, "Plate is required").max(10, "Plate is too long"),
  hours: z.number().min(1).max(24),
});

export default function Booking() {
  const { slotId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const parsedSlotId = slotId ? parseInt(slotId) : 0;
  
  const { data: slot, isLoading: isSlotLoading } = useGetSlot(parsedSlotId, {
    query: {
      enabled: !!parsedSlotId,
      queryKey: getGetSlotQueryKey(parsedSlotId)
    }
  });

  const createBooking = useCreateBooking();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehiclePlate: "",
      hours: 2,
    },
  });

  const hours = form.watch("hours");
  const totalCost = slot ? slot.pricePerHour * hours : 0;

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (!slot) return;
    
    createBooking.mutate({
      data: {
        slotId: slot.id,
        hours: data.hours,
        vehiclePlate: data.vehiclePlate.toUpperCase(),
      }
    }, {
      onSuccess: () => {
        toast({ title: "Booking Confirmed!", description: `Slot ${slot.slotNumber} booked successfully.` });
        setLocation("/my-bookings");
      },
      onError: (err: any) => {
        toast({ 
          title: "Booking Failed", 
          description: err.message || err.data?.error || "Could not reserve the slot.", 
          variant: "destructive" 
        });
      }
    });
  };

  if (isSlotLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  if (!slot) {
    return <div className="text-center py-12">Slot not found.</div>;
  }

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
          ← Back to Map
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Reserve Parking</h1>
        <p className="text-muted-foreground mt-1">Complete your booking details below.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Card className="bg-card h-full">
            <CardHeader>
              <CardTitle>Slot Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{slot.locationName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                  <Car size={20} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Slot Number</p>
                  <p className="font-medium">{slot.slotNumber} <Badge variant="outline" className="ml-2">{slot.type}</Badge></p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                  <CreditCard size={20} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rate</p>
                  <p className="font-medium">${slot.pricePerHour.toFixed(2)} / hour</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Booking Form</CardTitle>
              <CardDescription>Enter details to secure your spot</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="vehiclePlate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Plate Number</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC-1234" {...field} className="uppercase font-mono" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="hours"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center mb-4">
                          <FormLabel>Duration</FormLabel>
                          <span className="font-mono bg-muted px-2 py-1 rounded text-sm">{field.value} Hours</span>
                        </div>
                        <FormControl>
                          <Slider
                            min={1}
                            max={24}
                            step={1}
                            value={[field.value]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-muted/50 p-4 rounded-lg border border-border mt-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Rate</span>
                      <span>${slot.pricePerHour.toFixed(2)} / hr</span>
                    </div>
                    <div className="flex justify-between text-sm mb-4">
                      <span className="text-muted-foreground">Duration</span>
                      <span>{hours} hrs</span>
                    </div>
                    <Separator className="mb-4" />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-primary">${totalCost.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={createBooking.isPending}>
                    {createBooking.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Reservation"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}