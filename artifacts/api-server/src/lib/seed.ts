import bcrypt from "bcryptjs";
import { db, usersTable, parkingLocationsTable, parkingSlotsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export async function seedDemoData(): Promise<void> {
  try {
    const [existingAdmin] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, "admin@parkingfinder.com"));

    if (existingAdmin) {
      logger.info("Demo data already seeded, skipping");
      return;
    }

    logger.info("Seeding Satna Smart City demo data...");

    // Users
    const adminHash = await bcrypt.hash("admin123", 10);
    const userHash = await bcrypt.hash("user123", 10);

    await db.insert(usersTable).values([
      { email: "admin@parkingfinder.com", password: adminHash, name: "Admin User", role: "admin" },
      { email: "john@example.com",        password: userHash,  name: "Rahul Sharma",  role: "user" },
      { email: "jane@example.com",        password: userHash,  name: "Priya Singh",   role: "user" },
    ]).onConflictDoNothing();

    // Satna, MP parking locations
    await db.insert(parkingLocationsTable).values([
      {
        name: "Railway Station Parking",
        address: "Satna Railway Station, Station Road, Satna, MP 485001",
        lat: 24.5640,
        lng: 80.8348,
        totalSlots: 30,
        availableSlots: 20,
      },
      {
        name: "City Mall Parking",
        address: "Satna City Mall, Civil Lines, Satna, MP 485001",
        lat: 24.5900,
        lng: 80.8400,
        totalSlots: 40,
        availableSlots: 28,
      },
      {
        name: "Bus Stand Parking",
        address: "Satna Bus Stand, Bus Stand Road, Satna, MP 485001",
        lat: 24.5712,
        lng: 80.8297,
        totalSlots: 20,
        availableSlots: 12,
      },
    ]).onConflictDoNothing();

    const locations = await db.select().from(parkingLocationsTable).orderBy(parkingLocationsTable.id);

    if (locations.length === 0) {
      logger.warn("No locations found after seeding, skipping slot creation");
      return;
    }

    // Slot config per location
    const floors = ["Floor A", "Floor B", "Floor C"];
    const types: Array<"standard" | "handicap" | "electric" | "compact"> =
      ["standard", "standard", "standard", "standard", "standard", "standard", "standard", "compact", "electric", "handicap"];
    const statusPattern: Array<"available" | "booked" | "maintenance"> =
      ["available", "available", "booked", "available", "booked", "available", "available", "booked", "available", "available"];

    const slotRows: Array<{
      locationId: number;
      slotNumber: string;
      floor: string;
      type: string;
      status: string;
      pricePerHour: number;
    }> = [];

    for (const location of locations) {
      const floorsToUse = location.totalSlots <= 20 ? floors.slice(0, 2) : floors;
      const slotsPerFloor = Math.ceil(location.totalSlots / floorsToUse.length);

      for (let f = 0; f < floorsToUse.length; f++) {
        for (let s = 0; s < Math.min(slotsPerFloor, 10); s++) {
          const type = types[s % types.length];
          const status = statusPattern[s % statusPattern.length];
          // INR pricing
          const price = type === "electric" ? 40 : type === "handicap" ? 15 : type === "compact" ? 20 : 25;
          slotRows.push({
            locationId: location.id,
            slotNumber: `${String.fromCharCode(65 + f)}-${String(s + 1).padStart(2, "0")}`,
            floor: floorsToUse[f],
            type,
            status,
            pricePerHour: price,
          });
        }
      }
    }

    await db.insert(parkingSlotsTable).values(slotRows).onConflictDoNothing();

    logger.info({ users: 3, locations: locations.length, slots: slotRows.length }, "Satna demo data seeded");
  } catch (err) {
    logger.error({ err }, "Failed to seed demo data");
  }
}
