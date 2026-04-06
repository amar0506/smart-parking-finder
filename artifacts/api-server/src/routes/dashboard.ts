import { Router, type IRouter } from "express";
import { db, parkingSlotsTable, parkingLocationsTable, bookingsTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [totalSlotsResult] = await db.select({ count: sql<number>`count(*)` }).from(parkingSlotsTable);
  const [availResult] = await db.select({ count: sql<number>`count(*)` }).from(parkingSlotsTable).where(eq(parkingSlotsTable.status, "available"));
  const [bookedResult] = await db.select({ count: sql<number>`count(*)` }).from(parkingSlotsTable).where(eq(parkingSlotsTable.status, "booked"));
  const [maintResult] = await db.select({ count: sql<number>`count(*)` }).from(parkingSlotsTable).where(eq(parkingSlotsTable.status, "maintenance"));
  const [locationsResult] = await db.select({ count: sql<number>`count(*)` }).from(parkingLocationsTable);
  const [activeBookingsResult] = await db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(eq(bookingsTable.status, "active"));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [revenueResult] = await db
    .select({ total: sql<number>`coalesce(sum(total_cost), 0)` })
    .from(bookingsTable)
    .where(and(gte(bookingsTable.createdAt, today), eq(bookingsTable.status, "active")));

  res.json({
    totalSlots: Number(totalSlotsResult?.count ?? 0),
    availableSlots: Number(availResult?.count ?? 0),
    bookedSlots: Number(bookedResult?.count ?? 0),
    maintenanceSlots: Number(maintResult?.count ?? 0),
    totalLocations: Number(locationsResult?.count ?? 0),
    activeBookings: Number(activeBookingsResult?.count ?? 0),
    todayRevenue: Number(revenueResult?.total ?? 0),
  });
});

export default router;
