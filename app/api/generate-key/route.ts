import crypto from "crypto";
import {NextResponse} from "next/server";
import { ref, set, push } from "firebase/database";
import { db } from '@/app/lib/database/firebase';

export async function POST() {
    const apiKey = crypto.randomUUID();
    const apiKeysRef = ref(db, 'apiKeys');
    const newApiKeyRef = push(apiKeysRef);
    await set(newApiKeyRef, {
        key: apiKey,
        createdAt: new Date().toISOString()
    });
    return NextResponse.json({
        apiKey
    });
}