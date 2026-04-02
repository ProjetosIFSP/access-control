import pg from 'pg';
const pool = new pg.Pool({ connectionString: "postgresql://docker:docker@localhost:5432/access-control" });
pool.query('SELECT id, room_id FROM door_controller LIMIT 1').then(res => { console.log(res.rows); pool.end(); }).catch(console.error);
