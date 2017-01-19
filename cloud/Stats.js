var dateUtil = require('./DateUtil.js');
var Totals = require('./Totals.js');
var CommunityTotals = require('./CommunityTotals.js');

function Interval(start, end) {
	this.start = start;
	this.end = end;
	this.contains = function(date) {
		if (this.start <= date && this.end > date) {
			return true;
		} else {
			return false;
		}
	}
}

//http://stackoverflow.com/questions/563406/add-days-to-datetime
Date.prototype.addDays = function(days) {
	var dat = new Date(this.valueOf());
	dat.setDate(dat.getDate() + days);
	return dat;
}
Date.prototype.addMonths = function(months) {
	var dat = new Date(this.valueOf());
	dat.setMonth(dat.getMonth() + months);
	return dat;
}

/*
Adds contents of 2 arrays, arrays must be same length and contain numbers
*/
function addArrayContents(one, two) {
	if (one && two && one.length == two.length) {
		return one.map(function(e, i) {
			return e + two[i];
		});
	}
	return one;
}

/*
Sums the contents of an array
*/
function sumArray(arr) {
	if (!arr) {
		return 0;
	}

	return arr.reduce(function(a, b) {
		return a + b;
	});
}

Parse.Cloud.define("stats", function(request, response) {

	//number of queries that need to complete successfully to return success
	var queryCount = 4;
	var failureFlag = false;

	var responseObj = {};

	//setup daily intervals
	var startDate = new Date();
	startDate.setHours(0, 0, 0, 0); //midnight today

	var endDate = new Date(startDate);
	endDate = endDate.addDays(1); //midnight tomorrow

	var dayIntervals = [];
	for (var i = 0; i < 7; i++) {
		dayIntervals.push(new Interval(startDate, endDate));
		startDate = startDate.addDays(-1);
		endDate = endDate.addDays(-1);
	}

	//setup monthly intervals
	startDate = new Date();
	startDate.setHours(0, 0, 0, 0); //midnight today
	startDate.setDate(1); //midnight, first day of the month

	endDate = new Date(startDate);
	endDate.setMonth(endDate.getMonth() + 1); //midnight, first day of next month

	var monthIntervals = [];
	for (var i = 0; i < 12; i++) {
		monthIntervals.push(new Interval(new Date(startDate), new Date(endDate)));
		startDate.setMonth(startDate.getMonth() - 1);
		endDate.setMonth(endDate.getMonth() - 1);
	}


	//stats for friends
	var user = new Parse.User({
		id: request.params.userId
	});
	var userQuery = new Parse.Query("POFriendRelation");
	userQuery.equalTo("userId", user);
	userQuery.find({ useMasterKey: true }).then(
		function(friendRelations) { // success
			if (friendRelations && friendRelations.length > 0) {
				var friends = friendRelations.map(function(e) {
					return e.get("friendUser");
				});

				var userTotalsQuery = new Parse.Query("UserTotals");
				userTotalsQuery.containedIn("user", friends);
				userTotalsQuery.find().then(
					function(userTotals) { //success
						responseObj.friends = friendsStatsFromUserTotals(userTotals, dayIntervals, monthIntervals);
						if (--queryCount == 0 && !failureFlag) {
							response.success(responseObj);
						}
					},
					function(error) { // error
						failureFlag = true;
						console.error("Got an error " + error.code + " : " + error.message);
						response.error("Error retrieving monthly totals");
					}
				);

			} else {
				if (--queryCount == 0 && !failureFlag) {
					response.success(responseObj);
				}
			}
		},
		function(error) { // error
			failureFlag = true;
			console.error("Got an error " + error.code + " : " + error.message);
			response.error("Error looking up friends");
		}
	);


	//global stats
	responseObj.global = {};
	var monthlyQuery = new Parse.Query("MonthlyTotals");
	monthlyQuery.lessThan("date",new Date());
	monthlyQuery.addDescending("date");
	monthlyQuery.limit(monthIntervals.length); //last 12 months of data
	monthlyQuery.find({ useMasterKey: true }).then(
		function(monthlyResults) {
			responseObj.global.minutesDrivenMonths = [];
			responseObj.global.kmDrivenMonths = [];

			for (var i = 0; i < monthIntervals.length; i++) {
				if (i < monthlyResults.length) {
					var object = monthlyResults[i];
					responseObj.global.minutesDrivenMonths.push({
						date: object.get("date"),
						count: object.get("minutesTravelled")
					});
					responseObj.global.kmDrivenMonths.push({
						date: object.get("date"),
						count: (object.get("distanceTravelled") / 1000)
					});
				} else {
					responseObj.global.minutesDrivenMonths.push({
						date: monthIntervals[i].start,
						count: 0
					});
					responseObj.global.kmDrivenMonths.push({
						date: monthIntervals[i].start,
						count: 0
					});
				}
			}

			if (--queryCount == 0 && !failureFlag) {
				response.success(responseObj);
			}
		},
		function(error) {
			failureFlag = true;
			console.error("Got an error " + error.code + " : " + error.message);
			response.error("Error retrieving monthly totals");
		}
	);

	var dailyQuery = new Parse.Query("DailyTotals");
	dailyQuery.lessThan("date",new Date());
	dailyQuery.addDescending("date");
	dailyQuery.limit(dayIntervals.length); //last 7 days of data
	dailyQuery.find({ useMasterKey: true }).then(
		function(dailyResults) {
			responseObj.global.minutesDrivenDays = [];
			responseObj.global.kmDrivenDays = [];
			for (var i = 0; i < dayIntervals.length; i++) {
				if (i < dailyResults.length) {
					var object = dailyResults[i];
					responseObj.global.minutesDrivenDays.push({
						date: object.get("date"),
						count: object.get("minutesTravelled")
					});
					responseObj.global.kmDrivenDays.push({
						date: object.get("date"),
						count: (object.get("distanceTravelled") / 1000)
					});
				} else {
					responseObj.global.minutesDrivenDays.push({
						date: dayIntervals[i].start,
						count: 0
					});
					responseObj.global.kmDrivenDays.push({
						date: dayIntervals[i].start,
						count: 0
					});
				}
			}

			var mostRecent = dailyResults[0];
			if (mostRecent) {
				responseObj.global.total_users_daily_increase = mostRecent.get("users");
			}

			if (--queryCount == 0 && !failureFlag) {
				response.success(responseObj);
			}
		},
		function(error) {
			failureFlag = true;
			console.error("Got an error " + error.code + " : " + error.message);
			response.error("Error retrieving daily totals");
		}
	);

	var globalQuery = new Parse.Query("GlobalTotals");
	globalQuery.first({ useMasterKey: true }).then(
		function(results) {
			responseObj.global.missedMessages = results.get("missedSMSCount");
			responseObj.global.missedCalls = results.get("missedCallCount");
			responseObj.global.missedNotifications = results.get("missedOtherCount");
			responseObj.global.total_users = results.get("users");
			responseObj.global.totalTrips = results.get("trips");
			responseObj.global.totalDistance = results.get("distanceTravelled");
			responseObj.global.totalDuration = results.get("minutesTravelled") * 60;

			if (--queryCount == 0 && !failureFlag) {
				response.success(responseObj);
			}
		},
		function(error) {
			failureFlag = true;
			console.error("Got an error " + error.code + " : " + error.message);
			response.error("Error retrieving global totals");
		}
	);
});

function friendsStatsFromUserTotals(userTotals, dayIntervals, monthIntervals) {
	friends = {};
	friends.missedMessages = 0;
	friends.missedCalls = 0;
	friends.missedNotifications = 0;
	friends.totalDistance = 0;
	friends.totalDuration = 0;
	friends.totalTrips = 0;

	var kmDrivenDays = [0,0,0,0,0,0,0];
	var minutesDrivenDays = [0,0,0,0,0,0,0];
	friends.leaderboardDays = {};
	var kmDrivenMonths = [0,0,0,0,0,0,0,0,0,0,0,0];
	var minutesDrivenMonths = [0,0,0,0,0,0,0,0,0,0,0,0];
	friends.leaderboardMonths = {};

	if (userTotals) {
		for (var i = 0; i < userTotals.length; i++) {

			Totals.pushArraysIfnecessary(userTotals[i]);//make sure arrays are set for current day

			friends.missedMessages += userTotals[i].get("missedSMSCount") ? userTotals[i].get("missedSMSCount") : 0;
			friends.missedCalls += userTotals[i].get("missedCallCount") ? userTotals[i].get("missedCallCount") : 0;
			friends.missedNotifications += userTotals[i].get("missedOtherCount") ? userTotals[i].get("missedOtherCount") : 0;
			friends.totalDistance += userTotals[i].get("distanceTravelled") ? userTotals[i].get("distanceTravelled") : 0;
			friends.totalDuration += userTotals[i].get("minutesTravelled") ? userTotals[i].get("minutesTravelled") : 0;
			friends.totalTrips += userTotals[i].get("trips") ? userTotals[i].get("trips") : 0;

			kmDrivenDays = addArrayContents(kmDrivenDays, userTotals[i].get("dayDistanceTravelled"));
			minutesDrivenDays = addArrayContents(minutesDrivenDays, userTotals[i].get("dayMinutesTravelled"));

			var userId = userTotals[i].get("user").id;
			friends.leaderboardDays[userId] = {};
			friends.leaderboardDays[userId].meters = sumArray(userTotals[i].get("dayDistanceTravelled"));
			friends.leaderboardDays[userId].min = sumArray(userTotals[i].get("dayMinutesTravelled"));

			kmDrivenMonths = addArrayContents(kmDrivenMonths, userTotals[i].get("monthDistanceTravelled"));
			minutesDrivenMonths = addArrayContents(minutesDrivenMonths, userTotals[i].get("monthMinutesTravelled"));

			friends.leaderboardMonths[userId] = {};
			friends.leaderboardMonths[userId].meters = sumArray(userTotals[i].get("monthDistanceTravelled"));
			friends.leaderboardMonths[userId].min = sumArray(userTotals[i].get("monthMinutesTravelled"));
		}

		friends.totalDuration = friends.totalDuration * 60;

	}

	friends.kmDrivenDays = [];
	friends.minutesDrivenDays = [];
	for (var i = 0; i < dayIntervals.length; i++) {
		friends.kmDrivenDays[i] = {
			date: dayIntervals[i].start,
			count: (kmDrivenDays[i] / 1000)
		};
		friends.minutesDrivenDays[i] = {
			date: dayIntervals[i].start,
			count: minutesDrivenDays[i]
		};
	}

	friends.kmDrivenMonths = [];
	friends.minutesDrivenMonths = [];
	for (var i = 0; i < monthIntervals.length; i++) {
		friends.kmDrivenMonths[i] = {
			date: monthIntervals[i].start,
			count: (kmDrivenMonths[i] / 1000)
		};
		friends.minutesDrivenMonths[i] = {
			date: monthIntervals[i].start,
			count: minutesDrivenMonths[i]
		};
	}

	return friends;
}



Parse.Cloud.define("communityStats", function(request, response) {
	//number of queries that need to complete successfully to return success
	var queryCount = 3;
	var failureFlag = false;

	var responseObj = {};

	//setup daily intervals
	var startDate = new Date();
	startDate.setHours(0, 0, 0, 0); //midnight today

	var endDate = new Date(startDate);
	endDate = endDate.addDays(1); //midnight tomorrow

	var dayIntervals = [];
	for (var i = 0; i < 7; i++) {
		dayIntervals.push(new Interval(startDate, endDate));
		startDate = startDate.addDays(-1);
		endDate = endDate.addDays(-1);
	}

	//setup monthly intervals
	startDate = new Date();
	startDate.setHours(0, 0, 0, 0); //midnight today
	startDate.setDate(1); //midnight, first day of the month

	endDate = new Date(startDate);
	endDate.setMonth(endDate.getMonth() + 1); //midnight, first day of next month

	var monthIntervals = [];
	for (var i = 0; i < 12; i++) {
		monthIntervals.push(new Interval(new Date(startDate), new Date(endDate)));
		startDate.setMonth(startDate.getMonth() - 1);
		endDate.setMonth(endDate.getMonth() - 1);
	}

	var community = request.user.get("community");

	var monthlyQuery = new Parse.Query("CommunityMonthlyTotals");
	monthlyQuery.equalTo("community", community);
	monthlyQuery.lessThan("date", new Date());
	monthlyQuery.addDescending("date");
	monthlyQuery.limit(monthIntervals.length); //last 12 months of data
	monthlyQuery.find().then(
		function(monthlyResults) {
			responseObj.minutesDrivenMonths = [];
			responseObj.kmDrivenMonths = [];

			for (var i = 0; i < monthIntervals.length; i++) {
				if (i < monthlyResults.length) {
					var object = monthlyResults[i];
					responseObj.minutesDrivenMonths.push({
						date: object.get("date"),
						count: object.get("minutesTravelled")
					});
					responseObj.kmDrivenMonths.push({
						date: object.get("date"),
						count: (object.get("distanceTravelled") / 1000)
					});
				} else {
					responseObj.minutesDrivenMonths.push({
						date: monthIntervals[i].start,
						count: 0
					});
					responseObj.kmDrivenMonths.push({
						date: monthIntervals[i].start,
						count: 0
					});
				}
			}

			if (--queryCount == 0 && !failureFlag) {
				response.success(responseObj);
			}
		},
		function(error) {
			failureFlag = true;
			console.error("Got an error " + error.code + " : " + error.message);
			response.error("Error retrieving monthly totals");
		}
	);

	var dailyQuery = new Parse.Query("CommunityDailyTotals");
	dailyQuery.equalTo("community", community);
	dailyQuery.lessThan("date",new Date());
	dailyQuery.addDescending("date");
	dailyQuery.limit(dayIntervals.length); //last 7 days of data
	dailyQuery.find().then(
		function(dailyResults) {
			responseObj.minutesDrivenDays = [];
			responseObj.kmDrivenDays = [];
			for (var i = 0; i < dayIntervals.length; i++) {
				if (i < dailyResults.length) {
					var object = dailyResults[i];
					responseObj.minutesDrivenDays.push({
						date: object.get("date"),
						count: object.get("minutesTravelled")
					});
					responseObj.kmDrivenDays.push({
						date: object.get("date"),
						count: (object.get("distanceTravelled") / 1000)
					});
				} else {
					responseObj.minutesDrivenDays.push({
						date: dayIntervals[i].start,
						count: 0
					});
					responseObj.kmDrivenDays.push({
						date: dayIntervals[i].start,
						count: 0
					});
				}
			}

			var mostRecent = dailyResults[0];
			if (mostRecent) {
				responseObj.total_users_daily_increase = mostRecent.get("addedUsers");
			}

			if (--queryCount == 0 && !failureFlag) {
				response.success(responseObj);
			}
		},
		function(error) {
			failureFlag = true;
			console.error("Got an error " + error.code + " : " + error.message);
			response.error("Error retrieving daily totals");
		}
	);

	var allTimeQuery = new Parse.Query("CommunityAllTimeTotals");
	allTimeQuery.equalTo("community", community);
	allTimeQuery.first().then(
		function(results) {
			responseObj.missedMessages = results.get("missedSMSCount");
			responseObj.missedCalls = results.get("missedCallCount");
			responseObj.missedNotifications = results.get("missedOtherCount");
			responseObj.total_users = results.get("addedUsers") - results.get("removedUsers");
			responseObj.totalTrips = results.get("trips");
			responseObj.totalDistance = results.get("distanceTravelled");
			responseObj.totalDuration = results.get("minutesTravelled") * 60;

			if (--queryCount == 0 && !failureFlag) {
				response.success(responseObj);
			}
		},
		function(error) {
			failureFlag = true;
			console.error("Got an error " + error.code + " : " + error.message);
			response.error("Error retrieving all time totals");
		}
	);
});

Parse.Cloud.job("statForwardJob", function(request, status) {

		// add rows for community totals and normal totals

		var communityQuery = new Parse.Query("Community");
		communityQuery.find().then(
			function(results) {
				var callCount = 2;
				callCount += results.length * 3;

				// Add rows for the normal totals
				var currDate = new Date();
				Totals.getDailyTotals(currDate.addDays(1), function(sucessObj) {
					if (--callCount == 0) {
						status.success("new stats rows created");
					}
				}, function(error) {
					status.error("daily rows creation failure");
				});

				Totals.getMonthlyTotals(currDate.addMonths(1), function(sucessObj) {
					if (--callCount == 0) {
						status.success("new stats rows created");
					}
				}, function(error) {
					status.error("monthly rows creation failure");
				});


				// Add rows for the community totals
				for (var i = 0; i < results.length; i++) {
					var community = results[i];

					CommunityTotals.getAllTimeTotals(community, function(sucessObj) {
						if (--callCount == 0) {
							status.success("new stats rows created");
						}
					});

					CommunityTotals.getDailyTotals(community, currDate.addDays(1), function(sucessObj) {
						if (--callCount == 0) {
							status.success("new stats rows created");
						}
					}, function(error) {
						status.error("daily rows creation failure");
					});

					CommunityTotals.getMonthlyTotals(community, currDate.addMonths(1), function(sucessObj) {
						if (--callCount == 0) {
							status.success("new stats rows created");
						}
					}, function(error) {
						status.error("monthly rows creation failure");
					});
				};
			},
			function(error) {
				status.error("error when loading communities to create total rows");
			}
		);
});
