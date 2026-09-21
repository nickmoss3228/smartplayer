import { isConfigured, ping } from '../db/index.js';

/**
 * Prove the database is reachable before the server listens.
 *
 * Deliberately fatal. A server that starts without its database answers every
 * request with a 500, which reads as a bug in whatever endpoint someone happened
 * to try; a server that refuses to start makes the cause obvious. The pool
 * itself is lazy (db/client.ts) — this is the one place that forces it open.
 */
export async function connectDB() {
    try {
        if (!isConfigured()) {
            throw new Error('DATABASE_URL is not set');
        }
        const { database } = await ping();
        console.log(`Connected to PostgreSQL (database: ${database})`);
    } catch (err) {
        console.error('PostgreSQL connection error:', err.message);

        // Spell out the consequence. Without this, the only symptom downstream
        // is ERR_CONNECTION_REFUSED in the browser on every single API call,
        // which reads like a frontend or credentials problem rather than "the
        // server exited before it ever listened".
        console.error(
            '\n[db] The API server did NOT start. Every frontend request will\n' +
            '[db] fail with ERR_CONNECTION_REFUSED until this is resolved.\n'
        );

        // The two local causes seen in practice, named so nobody hunts for a
        // schema bug when the database is simply not running.
        if (err.code === 'ECONNREFUSED') {
            console.error(
                '[db] Cause: nothing is listening at DATABASE_URL. Locally that usually\n' +
                '[db] means the Postgres container is stopped:\n' +
                '[db]   docker start smartplayer-postgres\n'
            );
        }
        if (/SSL|self.signed/i.test(err.message ?? '')) {
            console.error(
                '[db] Cause: TLS mismatch. A local Postgres has no TLS — set PGSSL=disable\n' +
                '[db] in backend/.env. Managed PostgreSQL requires TLS, so leave it unset there.\n'
            );
        }

        process.exit(1);
    }
}
