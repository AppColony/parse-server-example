
Parse.Cloud.define("getPromotion", function(request, response) {

	var user = request.user;
	var Promotion = Parse.Object.extend("Promotion");

	var segmentedQuery = new Parse.Query(Promotion);
	segmentedQuery.containedIn("channels", user.get("channels"));

	var unfilteredQuery = new Parse.Query(Promotion);
	unfilteredQuery.doesNotExist("channels");

	var promotionQuery = Parse.Query.or(unfilteredQuery, segmentedQuery);
	promotionQuery.addAscending("createdAt");
	promotionQuery.greaterThan("expiresAt", new Date());
	promotionQuery.notEqualTo("viewedUsers", user);
	
	promotionQuery.first().then(
		function(promotion) {
			if (promotion) {
				promotion.relation("viewedUsers").add(user);
				promotion.save();
				var promotionJSON = {"url" : promotion.get("url")};
				response.success(promotionJSON);
			} else {
				//no promotions found
				response.success({});
			}
		},
		function(error) {
			console.error("Got an error " + error.code + " : " + error.message);
			response.error();
		}
	);
});
