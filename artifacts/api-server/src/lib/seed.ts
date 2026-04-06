import bcrypt from "bcryptjs";
import { db, usersTable, parkingLocationsTable, parkingSlotsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "./logger";

export async function seedDemoData(): Promise<void> {
  try {
    // Check if demo users already exist
    const [existingAdmin] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, "admin@parkingfinder.com"));

    if (existingAdmin) {
      logger.info("Demo data already seeded, skipping");
      return;
    }

    logger.info("Seeding demo data...");

    // Create demo users
    const adminHash = await bcrypt.hash("admin123", 10);
    const userHash = await bcrypt.hash("user123", 10);

    await db.insert(usersTable).values([
      { email: "admin@parkingfinder.com", password: adminHash, name: "Admin User", role: "admin" },
      { email: "john@example.com", password: userHash, name: "John Doe", role: "user" },
      { email: "jane@example.com", password: userHash, name: "Jane Smith", role: "user" },
    ]).onConflictDoNothing();

    // Create parking locations
    await db.insert(parkingLocationsTable).values([
      { name: "Downtown Parking Hub", address: "123 Main Street, City Center", lat: 40.7128, lng: -74.006, totalSlots: 30, availableSlots: 20 },
      { name: "Airport Terminal Garage", address: "1 Airport Blvd, Terminal 2", lat: 40.6413, lng: -73.7781, totalSlots: 50, availableSlots: 35 },
      { name: "Mall Parking Complex", address: "456 Shopping Ave, Westside", lat: 40.758, lng: -73.9855, totalSlots: 40, availableSlots: 28 },
    ]).onConflictDoNothing();

    // Get location IDs
    const locations = await db.select().from(parkingLocationsTable).orderBy(parkingLocationsTable.id);

    if (locations.length === 0) {
      logger.warn("No locations found after seeding, skipping slot creation");
      return;
    }

    // Seed parking slots for each location
    const floors = ["A", "B", "C"];
    const types = ["standard", "standard", "standard", "standard", "standard", "standard", "standard", "standard", "compact", "electric"] as const;
    const statusSets = [
      ["available", "available", "booked", "available", "booked", "available", "available", "booked", "available", "available"],
      ["available", "booked", "available", "available", "available", "booked", "available", "available", "available", "maintenance"],
      ["booked", "available", "available", "booked", "available", "available", "available", "available", "booked", "available"],
    ] as const;

    const slotRows: Array<{
      locationId: number;
      slotNumber: string;
      floor: string;
      type: string;
      status: string;
      pricePerHour: number;
    }> = [];

    for (const location of locations) {
      for (let f = 0; f < floors.length; f++) {
        for (let s = 0; s < 10; s++) {
          const type = types[s % types.length];
          const status = statusSets[f][s % statusSets[f].length];
          const price = type === "electric" ? 8.0 : type === "compact" ? 4.0 : 5.0;
          slotRows.push({
            locationId: location.id,
            slotNumber: `${floors[f]}-${String(s + 1).padStart(2, "0")}`,
            floor: `Floor ${floors[f]}`,
            type,
            status,
            pricePerHour: price,
          });
        }
      }
    }

    await db.insert(parkingSlotsTable).values(slotRows).onConflictDoNothing();

    logger.info({ users: 3, locations: locations.length, slots: slotRows.length }, "Demo data seeded successfully");
  } catch (err) {
    logger.error({ err }, "Failed to seed demo data");
  }
}
