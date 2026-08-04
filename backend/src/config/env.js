// Centralize dotenv and export needed env values.
import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    mongoUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    resendApiKey: process.env.RESEND_API_KEY,
    adminCode: process.env.ADMIN_CODE,
    // Yandex Object Storage (S3-compatible) — used by the Story Builder to
    // upload story/vocab/quiz audio. Uploads fail clearly until these are set.
    yandex: {
        accessKeyId: process.env.YANDEX_ACCESS_KEY_ID,
        secretAccessKey: process.env.YANDEX_SECRET_ACCESS_KEY,
        bucket: process.env.YANDEX_BUCKET,
        endpoint: process.env.YANDEX_ENDPOINT,
        baseUrl: process.env.YANDEX_BASE_URL, // public read URL prefix, matches frontend's VITE_YOS_BASE_URL
    },
};