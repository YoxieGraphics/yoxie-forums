const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const uri = `mongodb+srv://yoxie:${process.env.MONGO_PASSWORD}@threads.td5tebt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

async function connectToDatabase() {
	try {
		await client.connect();
		console.log('Connected to MongoDB');
		return client.db('threads');
	} catch (error) {
		console.error('Failed to connect to MongoDB:', error);
		throw error;
	}
}

function closeDatabase() {
	client.close();
	console.log('Closed MongoDB connection');
}

module.exports = { connectToDatabase, closeDatabase };