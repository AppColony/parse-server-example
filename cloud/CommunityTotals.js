var dateUtil = require('./DateUtil.js');

exports.getAllTimeTotals = function(community, callback) {
	//retrieve the AllTimeTotals object, create with defaults if necessary
	var CommunityAllTimeTotals = Parse.Object.extend("CommunityAllTimeTotals");
	var totalQuery = new Parse.Query(CommunityAllTimeTotals);
	totalQuery.equalTo("community", community);
	totalQuery.first({
		success: function(object) {
			var allTimeTotals = object;
			if (!allTimeTotals) {
				console.log("CommunityAllTimeTotals not found, creating");
				allTimeTotals = new CommunityAllTimeTotals();
				allTimeTotals.set("addedUsers", 0);
				allTimeTotals.set("removedUsers", 0);
				allTimeTotals.set("trips", 0);
				allTimeTotals.set("distanceTravelled", 0);
				allTimeTotals.set("minutesTravelled", 0);
				allTimeTotals.set("missedSMSCount", 0);
				allTimeTotals.set("missedCallCount", 0);
				allTimeTotals.set("missedOtherCount", 0);
				allTimeTotals.set("community", community);
				allTimeTotals.save();
			}
			callback(allTimeTotals);
		},
		error: function(error) {
			console.error("Got an error " + error.code + " : " + error.message);
		}
	});
}

exports.getDailyTotals = function(community, date, callback, failCallback) {
	//retrieve the dailyTotals object, create with defaults if necessary
	var CommunityDailyTotals = Parse.Object.extend("CommunityDailyTotals");
	var totalQuery = new Parse.Query(CommunityDailyTotals);
	var queryDate = new Date(date);
	queryDate.setHours(0, 0, 0, 0); //only year, month, day remain
	totalQuery.equalTo("date", queryDate);
	totalQuery.equalTo("community", community);
	totalQuery.first({
		success: function(object) {
			var dailyTotals = object;
			if (!dailyTotals) {
				console.log("CommunityDailyTotals not found, creating");
				dailyTotals = new CommunityDailyTotals();
				dailyTotals.set("date", queryDate);
				dailyTotals.set("addedUsers", 0);
				dailyTotals.set("removedUsers", 0);
				dailyTotals.set("trips", 0);
				dailyTotals.set("distanceTravelled", 0);
				dailyTotals.set("minutesTravelled", 0);
				dailyTotals.set("missedSMSCount", 0);
				dailyTotals.set("missedCallCount", 0);
				dailyTotals.set("missedOtherCount", 0);
				dailyTotals.set("community", community);
				dailyTotals.save();
			}
			callback(dailyTotals);
		},
		error: function(error) {
			console.error("Got an error " + error.code + " : " + error.message);

			if (failCallback) {
				failCallback(error);
			}
		}
	});
}

exports.getMonthlyTotals = function(community, date, callback, failCallback) {
	//retrieve the monthlyTotals object, create with defaults if necessary
	var CommunityMonthlyTotals = Parse.Object.extend("CommunityMonthlyTotals");
	var totalQuery = new Parse.Query(CommunityMonthlyTotals);
	var queryDate = new Date(date);
	queryDate.setHours(0, 0, 0, 0);
	queryDate.setDate(1); //only year, month remain
	totalQuery.equalTo("date", queryDate);
	totalQuery.equalTo("community", community);
	totalQuery.first({
		success: function(object) {
			var monthlyTotals = object;
			if (!monthlyTotals) {
				console.log("CommunityMonthlyTotals not found, creating");
				monthlyTotals = new CommunityMonthlyTotals();
				monthlyTotals.set("date", queryDate);
				monthlyTotals.set("addedUsers", 0);
				monthlyTotals.set("removedUsers", 0);
				monthlyTotals.set("trips", 0);
				monthlyTotals.set("distanceTravelled", 0);
				monthlyTotals.set("minutesTravelled", 0);
				monthlyTotals.set("missedSMSCount", 0);
				monthlyTotals.set("missedCallCount", 0);
				monthlyTotals.set("missedOtherCount", 0);
				monthlyTotals.set("community", community);
				monthlyTotals.save();
			}
			callback(monthlyTotals);
		},
		error: function(error) {
			console.error("Got an error " + error.code + " : " + error.message);

			if (failCallback) {
				failCallback(error);
			}
		}
	});
}

exports.updateTotals = function(trip, totals) {
	if (!trip.get("hidden")) {
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
		totals.save();
	}
}
