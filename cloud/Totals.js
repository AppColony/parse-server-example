var dateUtil = require('./DateUtil.js');

exports.getGlobalTotals = function(callback) {
	//retrieve the globalTotals object, create with defaults if necessary
	var GlobalTotals = Parse.Object.extend("GlobalTotals");
	var totalQuery = new Parse.Query(GlobalTotals);
	totalQuery.first().then(
		function(object) {
			var globalTotals = object;
			if (!globalTotals) {
				console.log("GlobalTotals not found, creating");
				globalTotals = new GlobalTotals();
				globalTotals.set("users", 0);
				globalTotals.set("trips", 0);
				globalTotals.set("distanceTravelled", 0);
				globalTotals.set("minutesTravelled", 0);
				globalTotals.set("missedSMSCount", 0);
				globalTotals.set("missedCallCount", 0);
				globalTotals.set("missedOtherCount", 0);
				globalTotals.save({},{ useMasterKey: true });
			}
			callback(globalTotals);
		},
		function(error) {
			console.error("Got an error " + error.code + " : " + error.message);
		}
	);
}

exports.getDailyTotals = function(date, callback, failCallback) {
	//retrieve the dailyTotals object, create with defaults if necessary
	var DailyTotals = Parse.Object.extend("DailyTotals");
	var totalQuery = new Parse.Query(DailyTotals);
	var queryDate = new Date(date);
	queryDate.setHours(0, 0, 0, 0); //only year, month, day remain
	totalQuery.equalTo("date", queryDate);
	totalQuery.first().then(
		function(object) {
			var dailyTotals = object;
			if (!dailyTotals) {
				console.log("DailyTotals not found, creating");
				dailyTotals = new DailyTotals();
				dailyTotals.set("date", queryDate);
				dailyTotals.set("users", 0);
				dailyTotals.set("trips", 0);
				dailyTotals.set("distanceTravelled", 0);
				dailyTotals.set("minutesTravelled", 0);
				dailyTotals.set("missedSMSCount", 0);
				dailyTotals.set("missedCallCount", 0);
				dailyTotals.set("missedOtherCount", 0);
				dailyTotals.save({},{ useMasterKey: true });
			}
			callback(dailyTotals);
		},
		function(error) {
			console.error("Got an error " + error.code + " : " + error.message);

			if (failCallback) {
				failCallback(error);
			}
		}
	);
}

exports.getMonthlyTotals = function(date, callback, failCallback) {
	//retrieve the monthlyTotals object, create with defaults if necessary
	var MonthlyTotals = Parse.Object.extend("MonthlyTotals");
	var totalQuery = new Parse.Query(MonthlyTotals);
	var queryDate = new Date(date);
	queryDate.setHours(0, 0, 0, 0);
	queryDate.setDate(1); //only year, month remain
	totalQuery.equalTo("date", queryDate);
	totalQuery.first().then(
		function(object) {
			var monthlyTotals = object;
			if (!monthlyTotals) {
				console.log("MonthlyTotals not found, creating");
				monthlyTotals = new MonthlyTotals();
				monthlyTotals.set("date", queryDate);
				monthlyTotals.set("users", 0);
				monthlyTotals.set("trips", 0);
				monthlyTotals.set("distanceTravelled", 0);
				monthlyTotals.set("minutesTravelled", 0);
				monthlyTotals.set("missedSMSCount", 0);
				monthlyTotals.set("missedCallCount", 0);
				monthlyTotals.set("missedOtherCount", 0);
				monthlyTotals.save({},{ useMasterKey: true });
			}
			callback(monthlyTotals);
		},
		function(error) {
			console.error("Got an error " + error.code + " : " + error.message);

			if (failCallback) {
				failCallback(error);
			}
		}
	);
}

exports.getUserTotals = function(userId, callback, failCallback) {
	//retrieve the userTotals object, create with defaults if necessary
	var UserTotals = Parse.Object.extend("UserTotals");
	var totalQuery = new Parse.Query(UserTotals);
	var user = new Parse.User({
		id: userId
	});
	totalQuery.equalTo("user", user);
	totalQuery.first({ useMasterKey: true }).then(
		function(object) {
			var userTotals = object;
			if (!userTotals) {

				var dayDate = new Date();
				dayDate.setHours(0, 0, 0, 0);

				var monthDate = new Date(dayDate);
				monthDate.setDate(1); //only year, month remain

				console.log("UserTotals not found, creating");
				userTotals = new UserTotals();
				userTotals.set("dayDistanceTravelled", [0,0,0,0,0,0,0]);
				userTotals.set("dayMinutesTravelled", [0,0,0,0,0,0,0]);
				userTotals.set("lastDay", dayDate);
				userTotals.set("monthDistanceTravelled", [0,0,0,0,0,0,0,0,0,0,0,0]);
				userTotals.set("monthMinutesTravelled", [0,0,0,0,0,0,0,0,0,0,0,0]);
				userTotals.set("lastMonth", monthDate);
				userTotals.set("missedCallCount", 0);
				userTotals.set("missedSMSCount", 0);
				userTotals.set("missedOtherCount", 0);
				userTotals.set("trips", 0);
				userTotals.set("distanceTravelled", 0);
				userTotals.set("minutesTravelled", 0);
				userTotals.set("user", user);
				userTotals.save({},{ useMasterKey: true });

				// console.log("UserTotals creating:"+JSON.stringify(userTotals));

			}
			callback(userTotals);
		},
		function(error) {
			console.error("Got an error " + error.code + " : " + error.message);

			if (failCallback) {
				failCallback(error);
			}
		}
	);
}

exports.updateTotals = function(trip, totals) {
	if (!trip.get("hidden") && trip.get("valid")) {
		totals.increment("trips");

		var distanceTravelled = trip.get("distanceTravelled");
		if (distanceTravelled) {
			totals.increment("distanceTravelled", distanceTravelled);
		}

		var startTime = trip.get("startTime");
		var endTime = trip.get("endTime");
		if (startTime && endTime) {
			totals.increment("minutesTravelled", dateUtil.getMinutesBetweenDates(startTime, endTime));
		}

		var missedSMSCount = trip.get("missedSMSCount");
		if (missedSMSCount) {
			totals.increment("missedSMSCount", missedSMSCount);
		}

		var missedCallCount = trip.get("missedCallCount");
		if (missedCallCount) {
			totals.increment("missedCallCount", missedCallCount);
		}

		var missedOtherCount = trip.get("missedOtherCount");
		if (missedOtherCount) {
			totals.increment("missedOtherCount", missedOtherCount);
		}
	}
}

exports.updateUserTotals = function(trip, totals) {

	if (!trip.get("hidden") && trip.get("valid")) {

		var distanceTravelled = trip.get("distanceTravelled");
		var startTime = trip.get("startTime");
		var endTime = trip.get("endTime");

		if (startTime && endTime && distanceTravelled) {

			exports.pushArraysIfnecessary(totals);

			var minutesTravelled = dateUtil.getMinutesBetweenDates(startTime, endTime);

			var tripDayDate = new Date(startTime);
			tripDayDate.setHours(0, 0, 0, 0); //only year, month, day remain

			var dayDistanceTravelled = totals.get("dayDistanceTravelled");
			var dayMinutesTravelled = totals.get("dayMinutesTravelled");
			var thisDay = new Date();
			thisDay.setHours(0, 0, 0, 0);

			var decrementDayFunction = function(date) {date.setDate(date.getDate() - 1);};
			incrementExistingPosition(7, thisDay, tripDayDate, distanceTravelled, dayDistanceTravelled, decrementDayFunction);
			totals.set("dayDistanceTravelled", dayDistanceTravelled);

			incrementExistingPosition(7, thisDay, tripDayDate, minutesTravelled, dayMinutesTravelled, decrementDayFunction);
			totals.set("dayMinutesTravelled", dayMinutesTravelled);

			//update the arrays representing the months of the year
			var tripMonthDate = new Date(tripDayDate);
			tripMonthDate.setDate(1); //only year, month remain

			var monthDistanceTravelled = totals.get("monthDistanceTravelled");
			var monthMinutesTravelled = totals.get("monthMinutesTravelled");
			var thisMonth = new Date(thisDay);
			thisMonth.setDate(1);

			var decrementMonthFunction = function(date) {
				date.setMonth(date.getMonth() - 1);
				date.setDate(1);
			};
			incrementExistingPosition(12, thisMonth, tripMonthDate, distanceTravelled, monthDistanceTravelled, decrementMonthFunction);
			totals.set("monthDistanceTravelled", monthDistanceTravelled);

			incrementExistingPosition(12, thisMonth, tripMonthDate, minutesTravelled, monthMinutesTravelled, decrementMonthFunction);
			totals.set("monthMinutesTravelled", monthMinutesTravelled);

			// console.log("UserTotals updating:"+JSON.stringify(totals));
		}

		exports.updateTotals(trip, totals);
	}
}

/*
	If the arrays need to be shifted, then shift them
*/
exports.pushArraysIfnecessary = function(totals) {

	var dayDistanceTravelled = totals.get("dayDistanceTravelled");
	var dayMinutesTravelled = totals.get("dayMinutesTravelled");
	var lastDay = totals.get("lastDay");
	var thisDay = new Date();
	thisDay.setHours(0, 0, 0, 0);
	//if the arrays aren't currently set for this day, push them until they are
	if (thisDay > lastDay) {
		var daysBetween = dateUtil.getDaysBetweenDates(thisDay, lastDay);
		pushArrayToNewDate(7, daysBetween, dayDistanceTravelled);
		pushArrayToNewDate(7, daysBetween, dayMinutesTravelled);
		totals.set("lastDay", thisDay);
	}

	var monthDistanceTravelled = totals.get("monthDistanceTravelled");
	var monthMinutesTravelled = totals.get("monthMinutesTravelled");
	var lastMonth = totals.get("lastMonth");
	var thisMonth = new Date(thisDay);
	thisMonth.setDate(1);

	//if the arrays aren't currently set for thisMonth, push them until they are
	if (thisMonth > lastMonth) {
		var monthsBetween = dateUtil.getMonthsBetweenDates(thisMonth, lastMonth);
		pushArrayToNewDate(12, monthsBetween, monthDistanceTravelled);
		pushArrayToNewDate(12, monthsBetween, monthMinutesTravelled);
		totals.set("lastMonth", thisMonth);
	}
}

/*
	adds the new value to the array and pads out with the necessary number of 0's
*/
function pushArrayToNewDate(count, unitsBetween, travelledArray) {
	var i = 0;
	var numShifts = (unitsBetween >= count)?count:unitsBetween;
	for (i = 0; i < numShifts; i++) {
		travelledArray.unshift(0);//add to start of array
		travelledArray.pop();//remove last element in array
	}
}

/*
	finds the existing position of a trip in an array and increments the value at that position
*/
function incrementExistingPosition(count, thisDate, tripDate, travelled, travelledArray, decrementDateFunction) {
	var i = 0;
	var dateForPosition = new Date(thisDate);
	for (i = 0; i < count; i++) {
		if (dateForPosition.valueOf() == tripDate.valueOf()) {
			travelledArray[i] = travelledArray[i] + travelled;
			break;
		}
		decrementDateFunction(dateForPosition);
	}
}
