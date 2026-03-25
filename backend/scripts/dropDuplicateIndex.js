import mongoose from 'mongoose';
import connectDB from '../config/mongodb.js';

const dropDuplicateIndex = async () => {
    try {
        await connectDB();
        
        const collection = mongoose.connection.collection('bookings');
        
        // Check existing indexes
        const indexes = await collection.getIndexes();
        console.log('Current indexes:', indexes);
        
        // Drop the problematic index
        if (indexes.bookingId_1) {
            await collection.dropIndex('bookingId_1');
            console.log('✓ Dropped bookingId_1 index');
        } else {
            console.log('bookingId_1 index not found');
        }
        
        // Verify indexes after dropping
        const updatedIndexes = await collection.getIndexes();
        console.log('Updated indexes:', updatedIndexes);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

dropDuplicateIndex();
