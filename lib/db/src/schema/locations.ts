import { pgTable, text, serial, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const parkingLocationsTable = pgTable("parking_locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  totalSlots: integer("total_slots").notNull().default(0),
  availableSlots: integer("available_slots").notNull().default(0),
  imageUrl: text("image_url"),
});

export const insertLocationSchema = createInsertSchema(parkingLocationsTable).omit({ id: true });
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type ParkingLocation = typeof parkingLocationsTable.$inferSelect;
