const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const bcrypt = require('bcrypt');
const path = require('path');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { connectToDatabase, closeDatabase } = require('./database'); // Import the database moduleconst { connectToDatabase, closeDatabase } = require('./database'); // Import the database module

const uri = `mongodb+srv://yoxie:${process.env.MONGO_PASSWORD}@threads.td5tebt.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(
	express.static('public', {
		setHeaders: (res, filePath) => {
			if (filePath.endsWith('.css')) {
				res.setHeader('Content-Type', 'text/css');
			}
			if (filePath.endsWith('.js')) {
				res.setHeader('Content-Type', 'text/javascript');
			}
		},
	})
);

let db;

(async () => {
	db = await connectToDatabase();
})();

const extractJWTFromCookies = (cookies) => {
	try {
		if (!cookies) {
			return null;
		}
		const tokenPair = cookies.split(';')
			.find((pair) => pair
				.startsWith('token='));
		if (!tokenPair) {
			return null;
		}

		return tokenPair.split('=')[1];
	}
	catch (err) {
		console.error(err);
	}

};

const extractJWTFromRequest = (req) => {
	const cookies = req.headers.cookie;
	const token = extractJWTFromCookies(cookies);

	if (!token) {
		return null;
	}

	return token;
};

const verifyJWT = (req, res, next) => {
	const token = extractJWTFromRequest(req);
	if (!token) {
		return res.redirect('/login');
	}

	try {
		const decodedToken = jwt.verify(token, process.env.JWT_SIGNING);
		req.user = decodedToken;
		next();
	} catch (error) {
		return res.status(401).json({ error: 'Invalid JWT token' });
	}
};

// Routes
app.get('/create', verifyJWT, (req, res) => {
	res.sendFile(path.join(__dirname, '/public/create.html'));
});

app.get('/signup', (req, res) => {
	res.sendFile(path.join(__dirname, '/public/signup.html'));
});

app.get('/profile', (req, res) => {
	res.sendFile(path.join(__dirname, '/public/profile.html'));
});

app.get('/login', (req, res) => {
	res.sendFile(path.join(__dirname, '/public/login.html'));
});

app.get('/account', verifyJWT, (req, res) => {
	res.sendFile(path.join(__dirname, '/public/account.html'));
});

app.get('/thread', verifyJWT, (req, res) => {
	res.sendFile(path.join(__dirname, 'public/thread.html'));
});

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'index.html'));
});
//END OF ROUTES

app.use('/newPost', verifyJWT, async (req, res) => {
	try {
		// Reference the "threads" collection in the specified database
		const col2 = db.collection('logins');
		const col = db.collection('threads');
		const token = extractJWTFromRequest(req);
		if (token == null) {
			return res.json({
				status: 'error',
				message: 'Not logged in.',
			});
		}
		const account = await db.collection('logins').findOne({ token: token });
		// Create a new thread document
		let threadDocument = {
			id: req.body.id,
			title: req.body.title,
			date: req.body.date,
			content: req.body.content,
			author: account.username,
			likes: 0,
			comments: [],
		};

		col2.updateOne(
			{ username: account.username }, { $set: { createdPosts: account.createdPosts + 1 } }
		)

		// Insert the document into the specified collection
		const p = await col.insertOne(threadDocument);

		// Find and return the document
		const thread = await col.findOne({ id: p.insertedId });
		res.json({
			status: 'success',
			message: 'Post created successfully!',
			thread: thread,
		});
	} catch (err) {
		console.log(err.stack);
		res.status(500).json({
			status: 'error',
			message: 'Failed to create post',
		});
	}
});

app.post('/login', async (req, res) => {
	const email = req.body.email; // Get the thread ID from the URL parameters
	const plaintextPassword = req.body.password;

	try {
		const col = db.collection('logins');
		const account = await col.findOne({ email: email });

		if (!account) {
			return res.status(404).json({
				status: 'error',
				message: 'Account not found',
			});
		} else {
			const result = await bcrypt.compare(
				plaintextPassword,
				account.password
			);
			if (result) {
				const token = jwt.sign(
					{
						username: account.username,
						email: account.email,
						id: account.id,
					},
					process.env.JWT_SIGNING,
					{ expiresIn: '720h' }
				);

				res.cookie('token', token, {
					httpOnly: true,
					maxAge: 2592000000, // 1 hour in milliseconds
				});
				col.updateOne({ username: account.username },
					{
						$set: {
							token: token
						}
					})




				// Set the JWT header
				res.setHeader('Authorization', `Bearer ${token}`);
				res.json('Successfully logged in!');
			} else {
				res.json('Invalid Email or password');
			}
		}
	} catch (err) {
		console.error(err);
		res.status(500).json({
			status: 'error',
			message: 'Failed to fetch account data from MongoDB',
		});
	}
});

app.post('/logout', (req, res) => {
	// Clear the token cookie to log the user out
	res.clearCookie('token');

	// Optionally, you can also invalidate the token on the server-side.
	// This step depends on your specific requirements.
	// For example, you can maintain a blacklist of revoked tokens and check if the token being logged out
	// exists in the blacklist when users log out to ensure the token can't be used again.

	res.json('Successfully logged out!');
});


app.post('/newComment', verifyJWT, async (req, res) => {
	const dbName = 'threads';

	try {
		// Connect to the Atlas cluster
		const db = client.db(dbName);
		// Reference the "threads" collection in the specified database
		const col = db.collection('threads');

		// Find the thread by its ID
		const token = extractJWTFromRequest(req);
		const account = await db.collection('logins').findOne({ token: token });
		const thread = await col.findOne({ id: req.body.id });

		if (thread) {
			// Create a new comment document
			const timeCreated = new Date()
			const newComment = {
				author: account.username,
				date: timeCreated.toLocaleDateString(),
				content: req.body.content,
				id: req.body.id,
				likes: 0,
			};

			// Push the new comment to the thread's comments array
			thread.comments.push(newComment);

			// Update the thread document in MongoDB
			await col.updateOne(
				{ id: thread.id },
				{ $set: { comments: thread.comments } }
			);

			res.json({
				status: 'success',
				message: 'Comment added successfully!',
				thread: thread,
			});
		} else {
			return res.status(404).json({
				status: 'error',
				message: 'Thread not found',
			});
		}
	} catch (err) {
		console.log(err.stack);
		res.status(500).json({
			status: 'error',
			message: 'Failed to add comment',
		});
	}
});

app.post('/register', async (req, res) => {
	const dbName = 'threads';
	try {
		// Connect to the Atlas cluster
		const db = client.db(dbName);
		// Reference the "threads" collection in the specified database
		const col = db.collection('logins');

		// Check if the email is already in use
		const emailExists = await col.findOne({ email: req.body.email });
		if (emailExists) {
			res.status(400).json({ message: 'Email is already in use.' });
			return;
		}

		// Check if the username is already in use
		const usernameExists = await col.findOne({
			username: req.body.username,
		});
		if (usernameExists) {
			res.status(400).json({ message: 'Username is already in use.' });
			return;
		}

		const token = jwt.sign(
			{
				username: req.body.username,
				email: req.body.email,
				id: req.body.id,
			},
			process.env.JWT_SIGNING,
			{ expiresIn: '720h' }
		);

		res.cookie('token', token, {
			httpOnly: true,
			maxAge: 2592000000, // 30 days in milliseconds
		});

		// Create a new thread document
		const accountParams = {
			username: req.body.username.toLowerCase(),
			email: req.body.email.toLowerCase(),
			password: await bcrypt.hash(req.body.plaintextPassword, 10),
			date: req.body.date,
			admin: req.body.admin,
			id: req.body.id,
			token: token,
			createdPosts: 0,
			posts: []
		};

		// Insert the document into the specified collection
		const p = await col.insertOne(accountParams);

		// Find and return the document
		const thread = await col.findOne({ id: p.insertedId });

		res.json({
			status: 'success',
			message: 'Account created successfully!',
			thread: thread,
		});
	} catch (err) {
		console.log(err.stack);
		res.status(500).json({ message: 'Failed to create account.' });
	}
});

app.get('/threads', async (req, res) => {
	const dbName = 'threads';
	try {
		const db = client.db(dbName);
		const col = db.collection('threads');
		const threads = await col.find({}).toArray();
		res.json(threads);
	} catch (err) {
		console.error(err);
		res.status(500).json({
			status: 'error',
			message: 'Failed to fetch thread data from MongoDB',
		});
	}
});

app.get('/thread/:id', async (req, res) => {
	const dbName = 'threads';
	const threadId = req.params.id; // Get the thread ID from the URL parameters

	try {
		const db = client.db(dbName);
		const col = db.collection('threads');
		const thread = await col.findOne({ id: threadId });

		if (!thread) {
			return res.status(404).json({
				status: 'error',
				message: 'Thread not found',
			});
		}

		res.json(thread);
	} catch (err) {
		console.error(err);
		res.status(500).json({
			status: 'error',
			message: 'Failed to fetch thread data from MongoDB',
		});
	}
});

app.get('/accountData', async (req, res) => {
	const dbName = 'threads';

	try {
		const db = client.db(dbName);
		const col = db.collection('logins');
		const token = extractJWTFromRequest(req);
		const threadsCol = db.collection('threads');
		const account = await col.findOne({ token: token });
		if (!account) {
			return res.status(404).json({
				status: 'error',
				message: 'Account not found',
			});
		};
		const posts = await threadsCol.find({ author: account.username }).toArray()
		const response = [account, posts]
		res.json(response);

	} catch (err) {
		console.error(err);
		res.status(500).json({
			status: 'error',
			message: 'Failed to fetch thread data from MongoDB',
		});
	}

});

app.get('/profile/:username', async (req, res) => {
	const dbName = 'threads';
	try {


		const db = client.db(dbName);
		const col = db.collection('logins');
		const threadsCol = db.collection('threads');
		let profile = await col.findOne({ username: req.params.username });
		delete profile.token;
		delete profile.email;
		delete profile.password;
		delete profile.id;
		if (!profile) {
			return res.status(404).json({
				status: 'error',
				message: 'Account not found',
			});
		};
		console.log(profile);
		const posts = await threadsCol.find({ author: profile.username }).toArray()
		const response = [profile, posts]
		res.json(response);
	} catch (err) {
		console.error(err);
		res.status(500).json({
			status: 'error',
			message: 'Failed to fetch thread data from MongoDB',
		});
	}
})

app.get('/deletePost/:id/', async (req, res) => {
	const dbName = 'threads';
	try {
		const db = client.db(dbName);
		const col = db.collection('threads');
		const accountCol = db.collection('logins');
		const threadToDelete = col.find({ id: req.params.id })
		const token = extractJWTFromRequest(req);
		const account = await db.collection('logins').findOne({ token: token });
		if (account.admin || threadToDelete.author == account.username) {
			col.findOneAndDelete({ id: req.params.id })
		} else {
			res.status(401).json({
				status: 'error',
				message: 'Insufficient Permissions',
			});
		}

	} catch (err) {
		console.error(err);
		res.status(500).json({
			status: 'error',
			message: 'Failed to delete post',
		});
	}
});

app.delete('/deleteComment/:commentId/:threadId', verifyJWT, async (req, res) => {
	const threadId = req.params.threadId;
	const commentId = req.params.commentId;


	try {
		const col = db.collection('threads');
		const token = extractJWTFromRequest(req);
		const account = await db.collection('logins').findOne({ token: token });

		// Find the thread by its ID
		const thread = await col.findOne({ id: threadId });
		const commentToDelete = thread.comments.find(comment => comment.id === commentId);

		if (!thread) {
			return res.status(404).json({
				status: 'error',
				message: 'Thread not found',
			});
		}

		// Check if the user is an admin or the author of the comment
		if (account.admin || commentToDelete.author === account.username) {
			// Find the index of the comment with the specified commentId
			const commentIndex = thread.comments.findIndex(comment => comment.id === commentId);

			if (commentIndex === -1) {
				return res.status(404).json({
					status: 'error',
					message: 'Comment not found',
				});
			}

			// Remove the comment from the comments array
			thread.comments.splice(commentIndex, 1);

			// Update the thread document in MongoDB
			await col.updateOne(
				{ id: threadId },
				{ $set: { comments: thread.comments } }
			);

			res.json({
				status: 'success',
				message: 'Comment deleted successfully!',
			});
		} else {
			res.status(401).json({
				status: 'error',
				message: 'Insufficient Permissions',
			});
		}
	} catch (err) {
		console.error(err);
		res.status(500).json({
			status: 'error',
			message: 'Failed to delete comment',
		});
	}
});


// Start the server
const port = process.env.PORT || 59904;
app.listen(port, () => {
	console.log(`Server started on port ${port}`);
});
