var CommunityTotals = require('./CommunityTotals.js');

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

Parse.Cloud.afterSave("Community", function(request) {
	var currDate = new Date();
	var community = request.object;

	// We want to create totals for new communities immediately

	CommunityTotals.getAllTimeTotals(community, function(sucessObj) {
	});

	CommunityTotals.getDailyTotals(community, currDate, function(sucessObj) {
	}, function(error) {
	});

	CommunityTotals.getMonthlyTotals(community, currDate, function(sucessObj) {
	}, function(error) {
	});

	CommunityTotals.getDailyTotals(community, currDate.addDays(1), function(sucessObj) {
	}, function(error) {
	});

	CommunityTotals.getMonthlyTotals(community, currDate.addMonths(1), function(sucessObj) {
	}, function(error) {
	});
});

Parse.Cloud.define("incrementUserCommunityStats", function(request, response) {
	incrementCommunityTotalsForKey(request.user.get("community"), "addedUsers", response);
});

Parse.Cloud.define("decrementUserCommunityStats", function(request, response) {
	var Community = Parse.Object.extend("Community");
	var community = new Community({
		id: request.params.community
	});
	incrementCommunityTotalsForKey(community, "removedUsers", response);
});

function incrementCommunityTotalsForKey(community, key, response) {
	var currDate = new Date();
	var queryCount = 3;

	CommunityTotals.getAllTimeTotals(community, function(allTimeTotals) {
		allTimeTotals.increment(key);
		allTimeTotals.save();
		if (--queryCount == 0) {
			response.success();
		}
	});
	CommunityTotals.getDailyTotals(community, currDate, function(dailyTotals) {
		dailyTotals.increment(key);
		dailyTotals.save();
		if (--queryCount == 0) {
			response.success();
		}
	});
	CommunityTotals.getMonthlyTotals(community, currDate, function(monthlyTotals) {
		monthlyTotals.increment(key);
		monthlyTotals.save();
		if (--queryCount == 0) {
			response.success();
		}
	});
}

