import pg from 'pg';
const pool = new pg.Pool({ connectionString: "postgresql://postgres:postgres@localhost:5432/access_control" });
pool.query('SELECT controller_id FROM rooms LIMIT 1').then(res => { console.log(res.rows); pool.end(); }).catch(console.error);
