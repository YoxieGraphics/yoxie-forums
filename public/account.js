function loadContent() {
	fetch('/account')
		.then(response => response.json())
		.then(account => {
			console.log(account);
			// Set thread details
			document.getElementById('welcomeMessage').innerHTML = account.username;
		});
}