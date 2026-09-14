import pg from "pg";
const { Client } = pg;

const client = new Client({
  connectionString: "postgresql://cookiex23_user:X1k6GYIzO61ANXd91gIC3tzB0i2UHTPI@dpg-dajs7hdg1s2s73c06gd0-a.oregon-postgres.render.com/cookiex23",
  ssl: { rejectUnauthorized: false }
});

const sql = `
  CREATE TABLE IF NOT EXISTS products (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
  );

  INSERT INTO products (id, name, description)
  VALUES ('legacy', 'Legacy Product', 'Producto legacy por defecto')
  ON CONFLICT (id) DO NOTHING;
`;

client.connect()
  .then(() => client.query(sql))
  .then(() => {
    console.log("✅ Producto legacy insertado correctamente");
    client.end();
  })
  .catch(err => {
    console.error("❌ Error:", err);
    client.end();
  });