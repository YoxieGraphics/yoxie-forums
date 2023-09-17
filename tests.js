const { MongoClient, ServerApiVersion, } = require('mongodb');
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
const dbName = 'threads';
try {
	// Connect to the Atlas cluster
	client.connect();
	const db = client.db(dbName);
	const col = db.collection('logins');
	col.updateOne(
		{ "username": "yoxie" },
		{
			$set: {
				posts: []
			}
		}
	);
} catch (e) {
	console.log(e);
};