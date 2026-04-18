import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgresql://beyercrm:beyercrm_dev_password@localhost:5432/beyercrm";

const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
