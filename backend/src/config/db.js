import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDB() {
    try {
        await mongoose.connect(config.mongoUri);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);

        // Spell out the consequence. Without this, the only symptom downstream
        // is ERR_CONNECTION_REFUSED in the browser on every single API call,
        // which reads like a frontend or credentials problem rather than "the
        // server exited before it ever listened".
        console.error(
            '\n[db] The API server did NOT start. Every frontend request will\n' +
            '[db] fail with ERR_CONNECTION_REFUSED until this is resolved.\n'
        );

        // querySrv failures are a DNS problem, not a bad password — the
        // mongodb+srv:// scheme needs an SRV lookup that some ISPs block
        // outright. It has bitten this project before and looks nothing like
        // a network issue in the stack trace.
        if (err.syscall === 'querySrv' || err.code === 'EREFUSED' || err.code === 'ENOTFOUND') {
            console.error(
                '[db] Cause: the SRV DNS lookup for the Atlas cluster was refused.\n' +
                '[db] This is usually ISP-level DNS filtering, not a wrong URI or\n' +
                '[db] password. Connect to a VPN and try again. (The production VM\n' +
                '[db] reaches Atlas fine, so this only affects local development.)\n'
            );
        }

        process.exit(1);
    }
}