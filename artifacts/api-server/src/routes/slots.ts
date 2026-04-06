import { Router, type IRouter } from "express";
import { db, parkingSlotsTable, parkingLocationsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { GetSlotsQueryParams, GetSlotParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/slots", async (req, res): Promise<void> => {
  const query = GetSlotsQueryParams.safeParse(req.query);
  
  let slots;
  if (query.success && query.data.locationId) {
    slots = await db.select().from(parkingSlotsTable).where(eq(parkingSlotsTable.locationId, Number(query.data.locationId)));
  } else {
    slots = await db.select().from(parkingSlotsTable);
  }

  const result = await Promise.all(slots.map(async (slot) => {
    const [location] = await db.select().from(parkingLocationsTable).where(eq(parkingLocationsTable.id, slot.locationId));
    let bookedByEmail: string | null = null;
    if (slot.bookedBy) {
      const userId = parseInt(slot.bookedBy, 10);
      if (!isNaN(userId)) {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
        bookedByEmail = user?.email ?? null;
      }
    }
    return {
      ...slot,
      bookedBy: bookedByEmail,
      bookedUntil: slot.bookedUntil ? slot.bookedUntil.toISOString() : null,
      locationName: location?.name ?? null,
    };
  }));
  
  res.json(result);
});

router.get("/slots/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetSlotParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [slot] = await db.select().from(parkingSlotsTable).where(eq(parkingSlotsTable.id, params.data.id));
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

export default router;
