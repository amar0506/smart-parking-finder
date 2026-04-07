import { useState } from "react";
import { format } from "date-fns";
import { ShieldAlert, Users, LayoutDashboard, ParkingSquare, CarFront, Trash2, Plus, Loader2, TrendingUp, IndianRupee } from "lucide-react";
import {
  useGetMe,
  useGetDashboardSummary,
  useAdminGetBookings,
  useAdminGetUsers,
  useGetSlots,
  useAdminCreateSlot,
  useAdminDeleteSlot,
  getGetSlotsQueryKey,
  useGetLocations
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

const PIE_COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#6366f1"];

export default function Admin() {
  const { data: user } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: summary } = useGetDashboardSummary();
  const { data: bookings } = useAdminGetBookings();
  const { data: users } = useAdminGetUsers();
  const { data: slots, isLoading: isSlotsLoading } = useGetSlots();
  const { data: locations } = useGetLocations();

  const createSlot = useAdminCreateSlot();
  const deleteSlot = useAdminDeleteSlot();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const form = useForm<z.infer<typeof slotSchema>>({
    resolver: zodResolver(slotSchema),
    defaultValues: { slotNumber: "", floor: "Floor A", type: "standard", pricePerHour: 20, locationId: undefined as any }
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
    if (confirm("Delete this slot?")) {
      deleteSlot.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Slot deleted" });
          queryClient.invalidateQueries({ queryKey: getGetSlotsQueryKey() });
        }
      });
    }
  };

  // Chart data
  const barData = locations?.map(loc => ({
    name: loc.name.replace(" Parking", ""),
    Available: loc.availableSlots,
    Booked: loc.totalSlots - loc.availableSlots,
  })) || [];

  const pieData = [
    { name: "Available", value: summary?.availableSlots || 0 },
    { name: "Booked", value: summary?.bookedSlots || 0 },
    { name: "Maintenance", value: (summary?.totalSlots || 0) - (summary?.availableSlots || 0) - (summary?.bookedSlots || 0) },
  ].filter(d => d.value > 0);

  const utilization = summary?.totalSlots
    ? Math.round((summary.bookedSlots / summary.totalSlots) * 100)
    : 0;

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
        <p className="text-muted-foreground mt-1 text-sm">Satna Smart City Parking Management</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="overview" className="text-xs md:text-sm"><LayoutDashboard size={14} className="mr-1 md:mr-2" /> Overview</TabsTrigger>
          <TabsTrigger value="slots" className="text-xs md:text-sm"><ParkingSquare size={14} className="mr-1 md:mr-2" /> Slots</TabsTrigger>
          <TabsTrigger value="bookings" className="text-xs md:text-sm"><CarFront size={14} className="mr-1 md:mr-2" /> Bookings</TabsTrigger>
          <TabsTrigger value="users" className="text-xs md:text-sm"><Users size={14} className="mr-1 md:mr-2" /> Users</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Today's Revenue</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold text-primary flex items-center">
                  <IndianRupee size={18} />
                  {summary?.todayRevenue?.toFixed(0) || "0"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Active Bookings</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold text-green-400">{summary?.activeBookings || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Total Slots</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold">{summary?.totalSlots || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Utilization</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold text-blue-400">{utilization}%</div>
                <Progress value={utilization} className="mt-2 h-1.5" />
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary" /> Slots by Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", fontSize: 12 }}
                    />
                    <Bar dataKey="Available" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Booked" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ParkingSquare size={16} className="text-primary" /> Slot Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", fontSize: 12 }}
                    />
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: "#94a3b8" }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Location Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Location Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {locations?.map(loc => {
                const util = loc.totalSlots > 0
                  ? Math.round(((loc.totalSlots - loc.availableSlots) / loc.totalSlots) * 100)
                  : 0;
                return (
                  <div key={loc.id}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{loc.name}</span>
                      <span className="text-xs text-muted-foreground">{loc.availableSlots}/{loc.totalSlots} free · {util}%</span>
                    </div>
                    <Progress value={util} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Slots */}
        <TabsContent value="slots" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Parking Slots</CardTitle>
                <CardDescription>Manage all physical spaces.</CardDescription>
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
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {locations?.map(loc => (
                                <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="slotNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Slot Number</FormLabel>
                            <FormControl><Input placeholder="A-101" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="floor" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Floor</FormLabel>
                            <FormControl><Input placeholder="Floor A" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="type" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                              </FormControl>
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
                          <FormItem>
                            <FormLabel>Price/Hour (₹)</FormLabel>
                            <FormControl><Input type="number" step="1" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
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
                          <TableCell className="font-medium text-xs">{slot.locationName}</TableCell>
                          <TableCell className="text-sm">{slot.slotNumber}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{slot.type}</Badge></TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${
                              slot.status === "available" ? "bg-green-600" :
                              slot.status === "booked" ? "bg-red-600" : "bg-yellow-600"
                            }`}>
                              {slot.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs">₹{slot.pricePerHour}/hr</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteSlot(slot.id)}>
                              <Trash2 size={14} />
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

        {/* Bookings */}
        <TabsContent value="bookings" className="mt-6">
          <Card>
            <CardHeader><CardTitle>All Bookings</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>User</TableHead>
                      <TableHead>Slot</TableHead>
                      <TableHead>Plate</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings?.map(booking => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{booking.userName}</div>
                          <div className="text-xs text-muted-foreground">{booking.userEmail}</div>
                        </TableCell>
                        <TableCell className="text-xs">{booking.locationName} · {booking.slotNumber}</TableCell>
                        <TableCell><Badge variant="outline" className="font-mono text-xs">{booking.vehiclePlate}</Badge></TableCell>
                        <TableCell className="text-xs">
                          {format(new Date(booking.startTime), "d MMM HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${
                            booking.status === "active" ? "border-green-600 text-green-400" :
                            booking.status === "completed" ? "border-blue-600 text-blue-400" : ""
                          }`}>{booking.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm">₹{booking.totalCost.toFixed(0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users */}
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
    </div>
  );
}
