import { pgTable, text, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const parkingSlotsTable = pgTable("parking_slots", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull(),
  slotNumber: text("slot_number").notNull(),
  floor: text("floor").notNull(),
  type: text("type").notNull().default("standard"),
  status: text("status").notNull().default("available"),
  pricePerHour: real("price_per_hour").notNull().default(5.0),
  bookedBy: text("booked_by"),
  bookedUntil: timestamp("booked_until", { withTimezone: true }),
});

export const insertSlotSchema = createInsertSchema(parkingSlotsTable).omit({ id: true, bookedBy: true, bookedUntil: true });
export type InsertSlot = z.infer<typeof insertSlotSchema>;
export type ParkingSlot = typeof parkingSlotsTable.$inferSelect;
