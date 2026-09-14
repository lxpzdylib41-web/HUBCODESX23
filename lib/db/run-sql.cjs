const fs = require("fs");
const { Client } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está configurado");
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();

    const sql = fs.readFileSync("./create-db.sql", "utf8");
    await client.query(sql);

    console.log("TABLAS CREADAS CORRECTAMENTE");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});