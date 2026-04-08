import { Router, type IRouter } from "express";
import { db, bookingsTable, parkingSlotsTable, usersTable, parkingLocationsTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { CreateBookingBody, GetBookingParams, CancelBookingParams } from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

async function enrichBooking(booking: any) {
  const [slot] = await db.select().from(parkingSlotsTable).where(eq(parkingSlotsTable.id, booking.slotId));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, booking.userId));
  let locationName: string | null = null;
  if (slot) {
    const [location] = await db.select().from(parkingLocationsTable).where(eq(parkingLocationsTable.id, slot.locationId));
    locationName = location?.name ?? null;
  }
  return {
    ...booking,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    createdAt: booking.createdAt.toISOString(),
    slotNumber: slot?.slotNumber ?? null,
    floor: slot?.floor ?? null,
    locationName,
    userEmail: user?.email ?? null,
    userName: user?.name ?? null,
    paymentStatus: booking.paymentStatus ?? "paid",
    paymentRef: booking.paymentRef ?? null,
  };
}

router.get("/bookings", requireAuth, async (req: any, res): Promise<void> => {
  const userId = req.user.id;
  const bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.userId, userId));
  const enriched = await Promise.all(bookings.map(enrichBooking));
  res.json(enriched);
});

router.post("/bookings", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { slotId, hours, vehiclePlate } = parsed.data;
  const userId = req.user.id;

  // Check for duplicate active booking on same vehicle plate
  const allUserBookings = await db.select().from(bookingsTable).where(eq(bookingsTable.userId, userId));
  const activeVehicleBooking = allUserBookings.find(
    b => b.vehiclePlate === vehiclePlate && (b.status === "active")
  );
  if (activeVehicleBooking) {
    res.status(400).json({ error: "Vehicle already has an active parking booking. Please cancel or complete the existing booking first." });
    return;
  }

  const [slot] = await db.select().from(parkingSlotsTable).where(eq(parkingSlotsTable.id, slotId));
  if (!slot) {
    res.status(400).json({ error: "Slot not found" });
    return;
  }
  if (slot.status !== "available") {
    res.status(400).json({ error: "Slot is not available" });
    return;
  }

  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);
  const totalCost = hours * slot.pricePerHour;

  // Generate payment reference
  const paymentRef = `UPI${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const [booking] = await db.insert(bookingsTable).values({
    userId,
    slotId,
    vehiclePlate,
    startTime,
    endTime,
    hours,
    totalCost,
    status: "active",
    paymentStatus: "pending",
    paymentRef,
  }).returning();

  await db.update(parkingSlotsTable).set({
    status: "booked",
    bookedBy: String(userId),
    bookedUntil: endTime,
  }).where(eq(parkingSlotsTable.id, slotId));

  const enriched = await enrichBooking(booking);
  res.status(201).json(enriched);
});

router.get("/bookings/:id", requireAuth, async (req: any, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetBookingParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [booking] = await db.select().from(bookingsTable).where(
    and(eq(bookingsTable.id, params.data.id), eq(bookingsTable.userId, req.user.id))
  );
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const enriched = await enrichBooking(booking);
  res.json(enriched);
});

router.delete("/bookings/:id", requireAuth, async (req: any, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = CancelBookingParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, params.data.id));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  if (booking.userId !== req.user.id && req.user.role !== "admin") {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  const cancelStatus = req.user.role === "admin" && booking.userId !== req.user.id
    ? "cancelled_by_admin"
    : "cancelled";

  await db.update(bookingsTable).set({ status: cancelStatus }).where(eq(bookingsTable.id, params.data.id));
  await db.update(parkingSlotsTable).set({
    status: "available",
    bookedBy: null,
    bookedUntil: null,
  }).where(eq(parkingSlotsTable.id, booking.slotId));

  res.json({ message: "Booking cancelled" });
});

export default router;
