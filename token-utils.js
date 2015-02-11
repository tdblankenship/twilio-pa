storeToken = function(token) {
	// Store our credentials and redirect back to our main page
	var collection = db.collection("tokens");
	var settings = {};
	settings._id = 'token';
	settings.access_token = token.access_token;
	settings.expires_at = new Date(token.expiry_date);
	settings.refresh_token = token.refresh_token;

	collection.save(settings, {
		w: 0
	});
}

updateToken = function(token) {
	var collection = db.collection("tokens");
	// attention to $set here
	collection.update({
		_id: 'token'
	}, {
		$set: {
			access_token: token.access_token,
			expires_at: new Date(token.expiry_date)
		}
	}, {
		w: 0
	});
}

authenticateWithCode = function(code) {
	oAuthClient.getToken(code, function(err, tokens) {
		if (err) {
			console.log('Error authenticating');
			console.log(err);
		} else {
			console.log('Successfully authenticated!');

			// Save that token
			storeToken(tokens);

			setCredentials(tokens.access_token, tokens.refresh_token);
		}
	});
}

refreshToken = function(refresh_token) {
	oAuthClient.refreshAccessToken(function(err, tokens) {
		console.log(tokens)
		updateToken(tokens);

		setCredentials(tokens.access_token, refresh_token);
	});
	console.log('access token refreshed');
}

authenticateWithDB = function(tokens) {
	// if current time < what's saved
	if (Date.compare(Date.today().setTimeToNow(), Date.parse(tokens.expires_at)) == -1) {
		console.log('using existing tokens');
		setCredentials(tokens.access_token, tokens.refresh_token);
	} else {
		// Token is expired, so needs a refresh
		console.log('getting new tokens');
		setCredentials(tokens.access_token, tokens.refresh_token);
		refreshToken(tokens.refresh_token);
	}
}

setCredentials = function(access_token, refresh_token) {
	oAuthClient.setCredentials({
		access_token: access_token,
		refresh_token: refresh_token
	});
}

module.exports = {
	refreshToken: refreshToken,
	
	setCredentials: function(access_token, refresh_token){
		setCredentials(access_token, refresh_token);
	},

	requestToken: function(res) {
		// Generate an OAuth URL and redirect there
		var url = oAuthClient.generateAuthUrl({
			access_type: 'offline',
			scope: 'https://www.googleapis.com/auth/calendar.readonly'
		});
		res.redirect(url);
	},

	authenticate: function(code) {
		var collection = db.collection("tokens");
		var today = Date.today().toString('yyyy-MM-dd');
		collection.findOne({}, function(err, tokens) {

			// Check for results
			if (tokens) {
				console.log('found')
				authenticateWithDB(tokens);
			} else {
				console.log('not-found')
				authenticateWithCode(code);
			}
		});
	}
}