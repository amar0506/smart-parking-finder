import { Router, type IRouter } from "express";
import { db, parkingSlotsTable, bookingsTable, usersTable, parkingLocationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { AdminCreateSlotBody, AdminUpdateSlotBody, AdminUpdateSlotParams, AdminDeleteSlotParams } from "@workspace/api-zod";
import { requireAdmin } from "./auth";

const router: IRouter = Router();

router.get("/admin/bookings", requireAdmin, async (_req, res): Promise<void> => {
  const bookings = await db.select().from(bookingsTable);
  const enriched = await Promise.all(bookings.map(async (booking) => {
    const [slot] = await db.select().from(parkingSlotsTable).where(eq(parkingSlotsTable.id, booking.slotId));
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, booking.userId));
    let locationName: string | null = null;
    if (slot) {
      const [loc] = await db.select().from(parkingLocationsTable).where(eq(parkingLocationsTable.id, slot.locationId));
      locationName = loc?.name ?? null;
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
    };
  }));
  res.json(enriched);
});

router.get("/admin/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  res.json(users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  })));
});

router.post("/admin/slots", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminCreateSlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [slot] = await db.insert(parkingSlotsTable).values({
    locationId: parsed.data.locationId,
    slotNumber: parsed.data.slotNumber,
    floor: parsed.data.floor,
    type: parsed.data.type,
    pricePerHour: parsed.data.pricePerHour,
    status: "available",
  }).returning();

  const [location] = await db.select().from(parkingLocationsTable).where(eq(parkingLocationsTable.id, slot.locationId));
  res.status(201).json({
    ...slot,
    bookedBy: null,
    bookedUntil: null,
    locationName: location?.name ?? null,
  });
});

router.patch("/admin/slots/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminUpdateSlotParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AdminUpdateSlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: any = {};
  if (parsed.data.slotNumber !== undefined) updateData.slotNumber = parsed.data.slotNumber;
  if (parsed.data.floor !== undefined) updateData.floor = parsed.data.floor;
  if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.pricePerHour !== undefined) updateData.pricePerHour = parsed.data.pricePerHour;

  const [slot] = await db.update(parkingSlotsTable).set(updateData).where(eq(parkingSlotsTable.id, params.data.id)).returning();
  if (!slot) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }

  const [location] = await db.select().from(parkingLocationsTable).where(eq(parkingLocationsTable.id, slot.locationId));
  res.json({
    ...slot,
    bookedBy: slot.bookedBy ?? null,
    bookedUntil: slot.bookedUntil ? slot.bookedUntil.toISOString() : null,
    locationName: location?.name ?? null,
  });
});

router.delete("/admin/slots/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminDeleteSlotParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [slot] = await db.delete(parkingSlotsTable).where(eq(parkingSlotsTable.id, params.data.id)).returning();
  if (!slot) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }

  res.json({ message: "Slot deleted" });
});

export default router;
