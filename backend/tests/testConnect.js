import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

console.log(process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

try {
  const client = await pool.connect();

  console.log("CONNECTED");

  const result = await client.query(
    "select current_database()"
  );

  console.log(result.rows);

  client.release();
}
catch (err) {
  console.error(err);
}