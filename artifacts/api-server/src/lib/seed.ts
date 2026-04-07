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

    const adminHash = await bcrypt.hash("admin123", 10);
    const userHash = await bcrypt.hash("user123", 10);

    await db.insert(usersTable).values([
      { email: "admin@parkingfinder.com", password: adminHash, name: "Admin User", role: "admin" },
      { email: "john@example.com",        password: userHash,  name: "Rahul Sharma", role: "user" },
      { email: "jane@example.com",        password: userHash,  name: "Priya Singh",  role: "user" },
    ]).onConflictDoNothing();

    // Satna, MP real parking locations
    await db.insert(parkingLocationsTable).values([
      {
        name: "Satna Railway Station Parking",
        address: "Railway Station Road, Satna, Madhya Pradesh 485001",
        lat: 24.5640, lng: 80.8348,
        totalSlots: 30, availableSlots: 20,
      },
      {
        name: "City Mall Satna Parking",
        address: "City Mall, Rewa Road, Satna, Madhya Pradesh 485001",
        lat: 24.5900, lng: 80.8400,
        totalSlots: 40, availableSlots: 28,
      },
      {
        name: "Satna Bus Stand Parking",
        address: "Bus Stand Road, Satna, Madhya Pradesh 485001",
        lat: 24.5712, lng: 80.8297,
        totalSlots: 20, availableSlots: 12,
      },
    ]).onConflictDoNothing();

    const locations = await db.select().from(parkingLocationsTable).orderBy(parkingLocationsTable.id);
    if (locations.length === 0) { logger.warn("No locations, skipping slots"); return; }

    const floors = ["Floor A", "Floor B", "Floor C"];
    const types: Array<"standard"|"handicap"|"electric"|"compact"> =
      ["standard","standard","standard","standard","standard","standard","standard","compact","electric","handicap"];
    const statusPat: Array<"available"|"booked"|"maintenance"> =
      ["available","available","booked","available","booked","available","available","booked","available","available"];

    const slotRows: any[] = [];
    for (const location of locations) {
      const floorsToUse = location.totalSlots <= 20 ? floors.slice(0, 2) : floors;
      const slotsPerFloor = Math.min(10, Math.ceil(location.totalSlots / floorsToUse.length));
      for (let f = 0; f < floorsToUse.length; f++) {
        for (let s = 0; s < slotsPerFloor; s++) {
          const type = types[s % types.length];
          const status = statusPat[s % statusPat.length];
          const price = type === "electric" ? 40 : type === "handicap" ? 15 : type === "compact" ? 20 : 25;
          slotRows.push({
            locationId: location.id,
            slotNumber: `${String.fromCharCode(65 + f)}-${String(s + 1).padStart(2, "0")}`,
            floor: floorsToUse[f],
            type, status,
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
