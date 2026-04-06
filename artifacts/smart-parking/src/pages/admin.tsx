import { useState } from "react";
import { format } from "date-fns";
import { ShieldAlert, Users, LayoutDashboard, ParkingSquare, CarFront, Edit, Trash2, Plus, Loader2 } from "lucide-react";
import { 
  useGetMe, 
  useGetDashboardSummary, 
  useAdminGetBookings, 
  useAdminGetUsers,
  useGetSlots,
  useAdminCreateSlot,
  useAdminUpdateSlot,
  useAdminDeleteSlot,
  getGetSlotsQueryKey,
  useGetLocations
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// Slot Form Schema
const slotSchema = z.object({
  locationId: z.coerce.number(),
  slotNumber: z.string().min(1),
  floor: z.string().min(1),
  type: z.enum(["standard", "handicap", "electric", "compact"]),
  pricePerHour: z.coerce.number().min(0),
});

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
  const updateSlot = useAdminUpdateSlot();
  const deleteSlot = useAdminDeleteSlot();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const form = useForm<z.infer<typeof slotSchema>>({
    resolver: zodResolver(slotSchema),
    defaultValues: {
      slotNumber: "",
      floor: "1",
      type: "standard",
      pricePerHour: 5.0,
      locationId: undefined,
    }
  });

  const onSubmit = (data: z.infer<typeof slotSchema>) => {
    createSlot.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Slot created" });
        queryClient.invalidateQueries({ queryKey: getGetSlotsQueryKey() });
        setIsCreateOpen(false);
        form.reset();
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleDeleteSlot = (id: number) => {
    if(confirm("Delete this slot?")) {
      deleteSlot.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Slot deleted" });
          queryClient.invalidateQueries({ queryKey: getGetSlotsQueryKey() });
        }
      });
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert size={64} className="text-destructive mb-4" />
        <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You do not have administrator privileges.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
          <ShieldAlert className="mr-3 text-primary" /> Admin Control Panel
        </h1>
        <p className="text-muted-foreground mt-1">Manage infrastructure, users, and oversee operations.</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="overview"><LayoutDashboard size={16} className="mr-2" /> Overview</TabsTrigger>
          <TabsTrigger value="slots"><ParkingSquare size={16} className="mr-2" /> Slots</TabsTrigger>
          <TabsTrigger value="bookings"><CarFront size={16} className="mr-2" /> Bookings</TabsTrigger>
          <TabsTrigger value="users"><Users size={16} className="mr-2" /> Users</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Today's Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-primary">${summary?.todayRevenue?.toFixed(2) || "0.00"}</div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-[hsl(var(--available))]">{summary?.activeBookings || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Utilization Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  {summary?.totalSlots ? Math.round((summary.bookedSlots / summary.totalSlots) * 100) : 0}%
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="slots" className="mt-6">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Parking Slots Inventory</CardTitle>
                <CardDescription>Manage all physical parking spaces.</CardDescription>
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus size={16} className="mr-2"/> Add Slot</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Slot</DialogTitle>
                  </DialogHeader>
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
                      )}/>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="slotNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Slot Number</FormLabel>
                            <FormControl><Input placeholder="A-101" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}/>
                        <FormField control={form.control} name="floor" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Floor</FormLabel>
                            <FormControl><Input placeholder="1" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}/>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="type" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
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
                        )}/>
                        <FormField control={form.control} name="pricePerHour" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price/Hour ($)</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}/>
                      </div>
                      <Button type="submit" className="w-full mt-4" disabled={createSlot.isPending}>
                        {createSlot.isPending ? <Loader2 className="animate-spin" /> : "Create Slot"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isSlotsLoading ? <Skeleton className="w-full h-[400px]" /> : (
                <div className="rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Location</TableHead>
                        <TableHead>Slot</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slots?.map(slot => (
                        <TableRow key={slot.id}>
                          <TableCell className="font-medium">{slot.locationName}</TableCell>
                          <TableCell>{slot.slotNumber} (Fl {slot.floor})</TableCell>
                          <TableCell><Badge variant="outline">{slot.type}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={slot.status === 'available' ? 'default' : 'secondary'} className={
                              slot.status === 'available' ? 'bg-[hsl(var(--available))]' : 
                              slot.status === 'booked' ? 'bg-[hsl(var(--booked))]' : ''
                            }>
                              {slot.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteSlot(slot.id)}>
                              <Trash2 size={16} />
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

        <TabsContent value="bookings" className="mt-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>All Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border">
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
                          <div className="font-medium">{booking.userName}</div>
                          <div className="text-xs text-muted-foreground">{booking.userEmail}</div>
                        </TableCell>
                        <TableCell>{booking.locationName} • {booking.slotNumber}</TableCell>
                        <TableCell><Badge variant="outline" className="font-mono">{booking.vehiclePlate}</Badge></TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(booking.startTime), "MMM d HH:mm")} - {format(new Date(booking.endTime), "HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            booking.status === 'active' ? 'border-primary text-primary' : 
                            booking.status === 'completed' ? 'border-[hsl(var(--available))] text-[hsl(var(--available))]' : ''
                          }>{booking.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">${booking.totalCost.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>System Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border">
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
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(u.createdAt), "MMM d, yyyy")}</TableCell>
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