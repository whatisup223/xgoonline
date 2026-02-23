import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './models.js';

dotenv.config();

async function recover() {
    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI not found in environment');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const result = await User.updateMany(
            { role: 'admin' },
            {
                $set: {
                    isSuspended: false,
                    status: 'Active',
                    statusMessage: ''
                }
            }
        );

        console.log(`Successfully unsuspended ${result.modifiedCount} admin accounts.`);
        process.exit(0);
    } catch (err) {
        console.error('Error during recovery:', err);
        process.exit(1);
    }
}

recover();
