var dateUtil = require('cloud/DateUtil.js');
var Totals = require('cloud/Totals.js');
var CommunityTotals = require('cloud/CommunityTotals.js');

Parse.Cloud.beforeSave("POTrip", function(request, response) {
	
	var trip = request.object;
	trip.set("valid", checkTripValidity(trip));
	response.success();

});

Parse.Cloud.afterSave("POTrip", function(request) {

	var trip = request.object;
	if (!trip.existed()) {
		Totals.getGlobalTotals(function(globalTotals) {
			Totals.updateTotals(trip, globalTotals);
			globalTotals.save();
		});
		Totals.getDailyTotals(trip.get("startTime"), function(dailyTotals) {
			Totals.updateTotals(trip, dailyTotals);
			dailyTotals.save();
		});
		Totals.getMonthlyTotals(trip.get("startTime"), function(monthlyTotals) {
			Totals.updateTotals(trip, monthlyTotals);
			monthlyTotals.save();

		});
		Totals.getUserTotals(trip.get("userId"), function(userTotals) {
			Totals.updateUserTotals(trip, userTotals);
			userTotals.save();
		});

		var userQuery = new Parse.Query("User");
		userQuery.get(trip.get("userId"), {
			success: function(user) {
				var community = user.get("community");
				if (community != null) {
					CommunityTotals.getAllTimeTotals(community, function(globalTotals) {
						CommunityTotals.updateTotals(trip, globalTotals);
					});
					CommunityTotals.getDailyTotals(community, trip.get("startTime"), function(dailyTotals) {
						CommunityTotals.updateTotals(trip, dailyTotals);
					});
					CommunityTotals.getMonthlyTotals(community, trip.get("startTime"), function(monthlyTotals) {
						CommunityTotals.updateTotals(trip, monthlyTotals);
					});
				}
			},
			error: function(object, error) {
				console.error("Error when retrieving user to update stats " + error.code + " : " + error.message);
			}
		});
	}
});

/**
In order for a trip to be valid it must have conform to the following:
-have distance, startTime, and endTime
-been less than 2000km and 1 day in duration
-have an average speed of less than 200km/h
**/
function checkTripValidity(trip) {
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
	var averageSpeed = (distanceTravelled/1000) / (minutesTravelled/60);

	if (averageSpeed > 200) {
		return false;
	}

	return true;
}

Parse.Cloud.define("userAggregateData", function(request, response) {
	Parse.Cloud.useMasterKey();

	var counts = {};
	counts.sumSMS = 0;
	counts.sumCall = 0;
	counts.sumOther = 0;
	counts.sumTimeSeconds = 0;
	counts.sumDistance = 0;

	//stats for friends
	var user = new Parse.User({
		id: request.params.userId
	});

	var query = new Parse.Query("UserTotals");
	query.equalTo("user", user);
	query.first({
		success: function(totals) {
			counts.sumSMS = totals.get("missedSMSCount");
			counts.sumCall = totals.get("missedCallCount");
			counts.sumOther = totals.get("missedOtherCount");
			counts.sumTimeSeconds = (totals.get("minutesTravelled")*60);
			counts.sumDistance = totals.get("distanceTravelled");
			response.success(counts);

		},
		error: function(error) {
			//this is valid if the user doesn't have any trips
			console.log("Couldn't look up UserTotals for: "+request.params.userId);
			response.success(counts);
		}
	});
});
