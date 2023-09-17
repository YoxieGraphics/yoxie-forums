function createPost() {

	const postName = document.getElementById('postName').value;
	const postContent = document.getElementById('postContent').value;
	if (postContent.trim() == "" || postName.trim == "") {
		document.getElementById('confirmation').innerHTML = 'Post is empty'; // Use dot notation to access the style property
		document.getElementById('confirmation').style.display = 'block'; // Use dot notation to access the style property
		return 0;
	}
	console.log(`Name: ${postName}, content: ${postContent}`);

	const threadIdGenerator = () => {
		const timestamp = Date.now();
		const random = Math.random();
		const idToReturn = timestamp - random;
		return `${Math.round(idToReturn)}`;
	};

	// Use strict equality (===) to check for undefined
	const timeCreated = new Date()
	const threadData = {
		id: threadIdGenerator(),
		title: postName,
		date: timeCreated.toLocaleDateString(),
		content: postContent,
		comments: []
	};
	console.log(JSON.stringify(threadData));
	fetch('/accountData')
		.then(response => response.json())
		.then(response => {
			if (response.message == 'Account not found') {
				document.getElementById('confirmation').innerHTML = 'You are not logged in'; // Use dot notation to access the style property
				document.getElementById('confirmation').style.display = 'block'; // Use dot notation to access the style property
			}

			console.log(response)
			fetch('/newPost', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(threadData) // Pass the threadData object
			})
				.then(response => response.json())
				.then(data => {
					// Handle the response from the backend
					console.log(data); // Log the response data for reference
				})
				.catch(error => {
					console.log('Error:', error);
				});
			// location.reload();
			document.getElementById('confirmation').style.display = 'block'; // Use dot notation to access the style property
		});
}




function createAccount(username, email, plaintextPassword, plaintextPasswordConfirm) {
	if ((email.includes('@')) != true) {
		document.getElementById('createResponse').innerHTML = 'Email must contain an @';
	} else if ((email.includes('.')) != true) {
		document.getElementById('createResponse').innerHTML = 'Email must contain a period';
	} else if (plaintextPassword != plaintextPasswordConfirm) {
		document.getElementById('createResponse').innerHTML = 'Passwords do not match';
	} else if (plaintextPassword.length < 8) {
		document.getElementById('createResponse').innerHTML = 'Password is too short, must be at least 8 characters';
	}
	else if (/\s/.test(plaintextPassword)) {
		document.getElementById('createResponse').innerHTML = 'Password cannot contain spaces';
	} else {
		const timestamp = Date.now();
		const random = Math.random();
		const idToReturn = Math.round(timestamp - random);

		const userData = {
			username: username,
			email: email,
			plaintextPassword: plaintextPassword,
			date: new Date().toLocaleString(),
			id: idToReturn,
			admin: false
		};

		fetch('/register', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(userData) // Pass the threadData object
		})
			.then(response => response.json())
			.then(data => {
				// Handle the response from the backend
				console.log(data);
				document.getElementById('createResponse').innerHTML = data.message;
				document.getElementById('createResponse').style.display = 'block';
				// Log the response data for reference
			})
			.catch(error => {
				console.error('Error:', error);
			});


	}

}

function attemptLogin(email, password) {
	const userData = {
		email: email,
		password: password,
	};
	fetch('/login', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(userData) // Pass the threadData object
	})
		.then(response => response.json())
		.then(data => {
			// Handle the response from the backend
			console.log(data);
			document.getElementById('createResponse').innerHTML = data;
			document.getElementById('createResponse').style.display = 'block';
			// Log the response data for reference
		})
		.catch(error => {
			console.error('Error:', error);
		});
}

function loadThreadPage(threads) {
	const threadId = getThreadIdFromURL();

	const thread = threads.find(thread => thread.id === threadId);

	if (thread) {
		document.getElementById("threadTitle").textContent = thread.title;
		document.getElementById("threadAuthor").textContent = `Author: ${thread.author}`;
		document.getElementById("threadContent").textContent = (thread.content).replace(/\n/g, "\r");
	}
}

function getThreadIdFromURL() {
	const urlParams = new URLSearchParams(window.location.search);
	const threadId = urlParams.get('id');
	return parseInt(threadId);
}