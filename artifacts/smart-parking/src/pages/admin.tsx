import { useState } from "react";
import { format } from "date-fns";
import {
  ShieldAlert, Users, LayoutDashboard, ParkingSquare, CarFront,
  Trash2, Plus, Loader2, TrendingUp, IndianRupee, XCircle, CheckCircle2, Banknote
} from "lucide-react";
import {
  useGetMe, useGetDashboardSummary, useAdminGetBookings, useAdminGetUsers,
  useGetSlots, useAdminCreateSlot, useAdminDeleteSlot, getGetSlotsQueryKey, useGetLocations
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

const slotSchema = z.object({
  locationId: z.coerce.number(),
  slotNumber: z.string().min(1),
  floor: z.string().min(1),
  type: z.enum(["standard", "handicap", "electric", "compact"]),
  pricePerHour: z.coerce.number().min(0),
});

const PIE_COLORS = ["#22c55e", "#ef4444", "#f59e0b"];

export default function Admin() {
  const { data: user } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: summary } = useGetDashboardSummary();
  const { data: bookings, refetch: refetchBookings } = useAdminGetBookings();
  const { data: users } = useAdminGetUsers();
  const { data: slots, isLoading: isSlotsLoading } = useGetSlots();
  const { data: locations } = useGetLocations();

  const createSlot = useAdminCreateSlot();
  const deleteSlot = useAdminDeleteSlot();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<number | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const form = useForm<z.infer<typeof slotSchema>>({
    resolver: zodResolver(slotSchema),
    defaultValues: { slotNumber: "", floor: "Floor A", type: "standard", pricePerHour: 25, locationId: undefined as any }
  });

  const onSubmit = (data: z.infer<typeof slotSchema>) => {
    createSlot.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Slot created" });
        queryClient.invalidateQueries({ queryKey: getGetSlotsQueryKey() });
        setIsCreateOpen(false);
        form.reset();
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const handleDeleteSlot = (id: number) => {
    if (confirm("Delete this slot? This cannot be undone.")) {
      deleteSlot.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Slot deleted" });
          queryClient.invalidateQueries({ queryKey: getGetSlotsQueryKey() });
        }
      });
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelBookingId) return;
    setIsCancelling(true);
    try {
      const token = localStorage.getItem("parking_token");
      const res = await fetch(`/api/admin/bookings/${cancelBookingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to cancel");
      }
      toast({ title: "Booking Cancelled", description: "Slot is now available again." });
      refetchBookings();
      queryClient.invalidateQueries({ queryKey: getGetSlotsQueryKey() });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsCancelling(false);
      setCancelBookingId(null);
    }
  };

  const barData = locations?.map(loc => ({
    name: loc.name.replace(" Parking", ""),
    Available: loc.availableSlots,
    Booked: loc.totalSlots - loc.availableSlots,
  })) || [];

  const pieData = [
    { name: "Available", value: summary?.availableSlots || 0 },
    { name: "Booked", value: summary?.bookedSlots || 0 },
    { name: "Other", value: Math.max(0, (summary?.totalSlots || 0) - (summary?.availableSlots || 0) - (summary?.bookedSlots || 0)) },
  ].filter(d => d.value > 0);

  const utilization = summary?.totalSlots
    ? Math.round((summary.bookedSlots / summary.totalSlots) * 100) : 0;

  const activeBookings = bookings?.filter(b => b.status === "active") || [];
  const todayRevenue = activeBookings.reduce((sum, b) => sum + (b.totalCost || 0), 0);

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert size={64} className="text-destructive mb-4" />
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You do not have administrator privileges.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <ShieldAlert className="text-primary" /> Admin Control Panel
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Satna Smart City Parking · Full Control</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="overview" className="text-xs md:text-sm"><LayoutDashboard size={14} className="mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="bookings" className="text-xs md:text-sm"><CarFront size={14} className="mr-1" />Bookings</TabsTrigger>
          <TabsTrigger value="slots" className="text-xs md:text-sm"><ParkingSquare size={14} className="mr-1" />Slots</TabsTrigger>
          <TabsTrigger value="users" className="text-xs md:text-sm"><Users size={14} className="mr-1" />Users</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Slots", value: summary?.totalSlots ?? 0, icon: ParkingSquare, color: "text-blue-400" },
              { label: "Available", value: summary?.availableSlots ?? 0, icon: CheckCircle2, color: "text-green-400" },
              { label: "Booked", value: summary?.bookedSlots ?? 0, icon: CarFront, color: "text-red-400" },
              { label: "Active Bookings", value: summary?.activeBookings ?? 0, icon: Banknote, color: "text-yellow-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                    <Icon size={16} className={color} />
                  </div>
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <IndianRupee size={14} className="text-primary" /> Revenue (Active Bookings)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">₹{todayRevenue.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground mt-1">{activeBookings.length} active bookings</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp size={14} className="text-primary" /> Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-400">{utilization}%</div>
                <Progress value={utilization} className="mt-3 h-2" />
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Slots by Location</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 9, fill: "#64748b" }} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", fontSize: 11 }} />
                    <Bar dataKey="Available" fill="#22c55e" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Booked" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Slot Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", fontSize: 11 }} />
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 10, color: "#94a3b8" }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Location Utilization</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {locations?.map(loc => {
                const util = loc.totalSlots > 0 ? Math.round(((loc.totalSlots - loc.availableSlots) / loc.totalSlots) * 100) : 0;
                return (
                  <div key={loc.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{loc.name}</span>
                      <span className="text-xs text-muted-foreground">{loc.availableSlots}/{loc.totalSlots} free · {util}%</span>
                    </div>
                    <Progress value={util} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BOOKINGS ── */}
        <TabsContent value="bookings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Bookings</CardTitle>
              <CardDescription>View and manage all parking reservations · admin can cancel any booking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>User</TableHead>
                      <TableHead>Slot</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No bookings yet</TableCell>
                      </TableRow>
                    )}
                    {bookings?.map(booking => {
                      const isCancelled = booking.status === "cancelled" || booking.status === "cancelled_by_admin";
                      return (
                        <TableRow key={booking.id} className={isCancelled ? "opacity-60" : ""}>
                          <TableCell>
                            <div className="font-medium text-sm">{booking.userName}</div>
                            <div className="text-xs text-muted-foreground">{booking.userEmail}</div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div>{booking.locationName}</div>
                            <div className="text-muted-foreground">{booking.slotNumber}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">{booking.vehiclePlate}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div>{format(new Date(booking.startTime), "d MMM HH:mm")}</div>
                            <div className="text-muted-foreground">{booking.hours}h</div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${
                              (booking as any).paymentStatus === "paid" ? "bg-green-700" : "bg-yellow-700"
                            }`}>
                              {(booking as any).paymentStatus === "paid" ? "✓ Paid" : "Pending"}
                            </Badge>
                            {(booking as any).paymentRef && (
                              <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">{(booking as any).paymentRef}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${
                              booking.status === "active" ? "border-green-600 text-green-400" :
                              booking.status === "cancelled_by_admin" ? "border-red-600 text-red-400" :
                              booking.status === "cancelled" ? "border-muted-foreground text-muted-foreground" :
                              "border-blue-600 text-blue-400"
                            }`}>
                              {booking.status === "cancelled_by_admin" ? "Cancelled by Admin" :
                               booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm">₹{booking.totalCost.toFixed(0)}</TableCell>
                          <TableCell className="text-right">
                            {!isCancelled && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setCancelBookingId(booking.id)}
                              >
                                <XCircle size={12} className="mr-1" /> Cancel
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SLOTS ── */}
        <TabsContent value="slots" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Parking Slots</CardTitle>
                <CardDescription>Manage all physical parking spaces</CardDescription>
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus size={14} className="mr-1" /> Add Slot</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Slot</DialogTitle></DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField control={form.control} name="locationId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {locations?.map(loc => <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="slotNumber" render={({ field }) => (
                          <FormItem><FormLabel>Slot Number</FormLabel><FormControl><Input placeholder="A-101" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="floor" render={({ field }) => (
                          <FormItem><FormLabel>Floor</FormLabel><FormControl><Input placeholder="Floor A" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="type" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="handicap">Handicap</SelectItem>
                                <SelectItem value="electric">Electric (EV)</SelectItem>
                                <SelectItem value="compact">Compact</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="pricePerHour" render={({ field }) => (
                          <FormItem><FormLabel>Price/Hour (₹)</FormLabel><FormControl><Input type="number" step="5" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      <Button type="submit" className="w-full" disabled={createSlot.isPending}>
                        {createSlot.isPending ? <Loader2 className="animate-spin" /> : "Create Slot"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isSlotsLoading ? <Skeleton className="w-full h-[300px]" /> : (
                <div className="rounded-md border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Location</TableHead>
                        <TableHead>Slot</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slots?.map(slot => (
                        <TableRow key={slot.id}>
                          <TableCell className="text-xs font-medium">{slot.locationName}</TableCell>
                          <TableCell className="text-sm">{slot.slotNumber} <span className="text-muted-foreground text-xs">· {slot.floor}</span></TableCell>
                          <TableCell><Badge variant="outline" className="text-xs capitalize">{slot.type}</Badge></TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${
                              slot.status === "available" ? "bg-green-700" :
                              slot.status === "booked" ? "bg-red-700" : "bg-yellow-700"
                            }`}>{slot.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs">₹{slot.pricePerHour}/hr</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteSlot(slot.id)}>
                              <Trash2 size={13} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── USERS ── */}
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader><CardTitle>System Users</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-sm">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">{u.role}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(u.createdAt), "d MMM yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Admin cancel booking confirmation */}
      <AlertDialog open={!!cancelBookingId} onOpenChange={(o) => { if (!o) setCancelBookingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking as Admin</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the booking and make the parking slot available again.
              The booking will be marked as "Cancelled by Admin".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <XCircle size={14} className="mr-2" />}
              Cancel Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
