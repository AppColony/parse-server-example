/*
This script updates the UserTotals table by going through each user, getting all of their trips, and then creating/updating
a row in the UserTotals table.  Trips are limited to before a certain date as we should only need to migrate trips that happen
before then.

NOTES
-this wouldn't run initally because of the way Parse requires cloud code module to be defined
you'd see errors like: Error: Cannot find module 'cloud/DateUtil.js'
Parse requires modules to be loaded starting with cloud/ and that path doesn't exist.
Got around this by creating a symlink to cloude in node_modules and commiting it

-note that by default this script is using the OneTap - Dev properties, it needs to modifies to point at prod.  It also has a date
thats used to limit the trips that are migrated.  The intent behind this is that only need to migrate trips up to a certain point
in time.  Anything past that point was already processed an aggregated in an afterSave

To run:
-install node (http://blog.parse.com/learn/engineering/the-javascript-sdk-in-node-js/)
-optional, upgrade parse library with "npm install parse"
-optional, updgrade winsston logging library with "npm install winston"
This script leaks memory somehwere, I think its something to do with the callbacks and closures.  I looked
into fixing it, but I'm not enough of a node/javascript guy to figure it out easily and it wasn't going
to be worth the time.  So just increase the memory its allowed to 4 gigs.
- run "node --max-old-space-size=4096 userTotalsMigration.js"
*/


GLOBAL.Parse = require("parse/node").Parse;
var Totals = require("cloud/Totals.js");
var dateUtil = require('cloud/DateUtil.js');
var fs = require('fs');
var winston = require('winston');
winston.level = 'debug';


winston.add(winston.transports.File, {
	filename: 'migration.log'
});


winston.log("info", "starting migration");


var usersFileName = "users.txt";

//make sure users file exists
fs.writeFile(usersFileName, "", {
	flag: 'wx'
}, function(err, data) {
	if (err) {
		winston.error("failed to create new file" + err);
	}
});

//Change these values to whichever server you want to point to.  DO NOT COMMIT PROD VALUES.
//OnTap - Dev
// Parse.initialize("nORiB9P52mCaD1Sm72mKQlhLcjgHGjGkpvW7tZO5", "dzZvJlukUtzF7GtzYz3HgnNiQGdjG18vHvZGfxu9", "R5YWuexk6BUdrCGrkz5HqLDvozv5iAzjw4lUC1AX"); //CHANGE ME

//DDTEST
Parse.initialize("MAIo1Gvu1AVUXSVc135qGtWWpCIeN76OGhOwhdQv", "Zv0PK1FXek6NcElIOU5Pb2RqwmZKbGqstPD3jnHi", "oMdXZbRevJE1pSjxSBPo9ZRAiy6kcodGbW5mKJYV"); //CHANGE ME


Parse.Cloud.useMasterKey();

var savedUsers = retrieveUsersFromFile();

//for each user, update their user totals
var userCount = 0;

var userQuery = new Parse.Query("User");
userQuery.each(
	function(user) {
		winston.log("info", "user count: " + userCount++);
		if (savedUsers.indexOf(user.id) > -1) {
			winston.log("info", "user " + user.id + " already processed, skipping");
			return delay(10); //delay 10ms before moving onto the next user
		} else {
			winston.log("info", "processing user " + user.id);
			updateUserTotals(user.id);
			return delay(200); //delay 500ms before moving onto the next user
		}
		
	}, {
		success: function() {
			winston.log("info", 'done user queries, waiting to save');
			setTimeout(function() {
				winston.log("info", "ending migration");

			}, 10000);

		},
		error: function(error) {
			winston.error("error while retrieving users " + error.code + " : " + error.message);
		}
	}
);

//promise that delays being fullfilled to slow down the execution process
var delay = function(millis) {
	var promise = new Parse.Promise();
	setTimeout(function() {
		promise.resolve();
	}, millis);
	return promise;
};

//update the user totals for userId
function updateUserTotals(userId) {
	var limit = 1000;
	var skip = 0;
	var trips = [];
	var tripQuery = new Parse.Query("POTrip");
	tripQuery.equalTo("userId", userId);

	var tripQueryOptions = {
		success: function(results) {

			if (results && results.length == limit) {
				for (var i = 0; i < results.length; i++) {
					trips.push(results[i]);
				}
				skip += limit;
				tripQuery.skip(skip);
				tripQuery.find(tripQueryOptions);
			} else {

				if (results.length > 0) {
					for (var i = 0; i < results.length; i++) {
						trips.push(results[i]);
					}
				}

				processTrips(userId, trips);

			}
		},
		error: function(error) {
			winston.error("Error when pulling trips for user " + userId + " " + error.code + " : " + error.message);
		}
	};

	tripQuery.limit(limit);
	tripQuery.skip(skip);
	tripQuery.find(tripQueryOptions);
}

function processTrips(userId, trips) {
	if (trips.length > 0) {

		var length = trips.length;
		//remove invalid trips from trips array
		for (var i = length - 1; i >= 0; i--) {
			if (checkTripValidity(trips[i])) {
				trips[i].set("valid", true);
			} else {
				trips.splice(i, 1);
			}
		}

		Totals.getUserTotals(userId, function(userTotals) {

			if (userTotals.get("trips") < trips.length) {
				for (var i = 0; i < trips.length; i++) {
					//we only want to migrate trips that weren't already included in UserTotals.
					//userTotals was newly created or it was created after this trip
					if (!userTotals.get("createdAt") || trips[i].get("createdAt") < userTotals.get("createdAt")) {
						Totals.updateUserTotals(trips[i], userTotals);
					}
				}
				userTotals.save(null, {
					success: function(userTotals) {
						winston.log("info", "user: " + userId + " successfully updated with "+trips.length+" trips");
						writeUserToFile(userId);
					},
					error: function(userTotals, error) {
						winston.error("failed to save userTotals for user: " + userId + " error " + error.code + " : " + error.message);
					}
				});
			} else {
				winston.log("info", "migration already done done on user: " + userId);
				writeUserToFile(userId);
			}
		});
	} else {
		winston.log("info", "user: " + userId + " had no trips");
		writeUserToFile(userId);
	}
}

function checkTripValidity(trip) {

	if (trip.get("hidden")) {
		return false;
	}

	var distanceTravelled = trip.get("distanceTravelled");
	var startTime = trip.get("startTime");
	var endTime = trip.get("endTime");

	if (!distanceTravelled) {
		return false;
	}

	if (startTime && endTime) {
		var minutesTravelled = dateUtil.getMinutesBetweenDates(startTime, endTime);
	} else {
		return false;
	}

	//if we've gone more than 2000km or travelled for longer than a day
	if (distanceTravelled > 2000000 || minutesTravelled > 1440) {
		return false;
	}

	//average speed in km/h
	var averageSpeed = (distanceTravelled / 1000) / (minutesTravelled / 60);

	if (averageSpeed > 200) {
		return false;
	}

	return true;
}

function writeUserToFile(userId) {
	fs.appendFile(usersFileName, userId + "\n", function(err) {
		if (err) {
			winston.error("failed to write finished user to file userId: " + userId + " error " + err);
		}
	});
}

function retrieveUsersFromFile() {
	var users = [];
	try {
		usersFile = fs.lstatSync(usersFileName);
		if (usersFile.isFile()) {
			var rl = require('readline').createInterface({
				input: require('fs').createReadStream(usersFileName)
			});

			rl.on('line', function(line) {
				users.push(line.trim());
			});
		} else {
			winston.log("info", usersFileName + " existed, but wasn't a file");
		}
	} catch (e) {
		winston.log("info", usersFileName + " didn't exist");
	}

	return users;
}