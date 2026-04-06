import { Router, type IRouter } from "express";
import { db, parkingLocationsTable, parkingSlotsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/locations", async (_req, res): Promise<void> => {
  const locations = await db.select().from(parkingLocationsTable);
  
  // Add available slots count
  const result = await Promise.all(locations.map(async (loc) => {
    const [available] = await db
      .select({ count: sql<number>`count(*)` })
      .from(parkingSlotsTable)
      .where(and(
        eq(parkingSlotsTable.locationId, loc.id),
        eq(parkingSlotsTable.status, "available")
      ));
    
    const [total] = await db
      .select({ count: sql<number>`count(*)` })
      .from(parkingSlotsTable)
      .where(eq(parkingSlotsTable.locationId, loc.id));
    
    return {
      ...loc,
      availableSlots: Number(available?.count ?? 0),
      totalSlots: Number(total?.count ?? loc.totalSlots),
      imageUrl: loc.imageUrl ?? null,
    };
  }));
  
  res.json(result);
});

export default router;
