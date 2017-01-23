var ColumnUtil = require('./ColumnUtil.js');
var NetworkUtil = require('./NetworkUtil.js');
var PushNotifications = require('./PushNotifications.js');

Parse.Cloud.beforeSave("POFriendRequest", function(request, response) {

	ColumnUtil.mirrorColumnsForObject(request.object, "requesting_user", "requestingUser");
	ColumnUtil.mirrorColumnsForObject(request.object, "requested_user", "requestedUser");

	var requestingUser = request.object.get("requestingUser");
	var requestedUser = request.object.get("requestedUser");

	if (requestedUser.id != requestingUser.id) {
		var query = new Parse.Query("POFriendRelation");
		query.equalTo("friendUserId", requestingUser);
		query.equalTo("userId", requestedUser);
		query.find().then(
			function(results) {
				if (results.length > 0) {
					console.log("Not allowed to create a friend request when already friends.");
					response.error(JSON.stringify({
						code: 2,
						message: "Can't create friend request, already friends."
					}));
				} else {

					var queryFriendRequest = new Parse.Query("POFriendRequest");
					queryFriendRequest.equalTo("requestingUser", requestingUser);
					queryFriendRequest.equalTo("requestedUser", requestedUser);

					var queryInverseFriendRequest = new Parse.Query("POFriendRequest");
					queryInverseFriendRequest.equalTo("requestingUser", requestedUser);
					queryInverseFriendRequest.equalTo("requestedUser", requestingUser);

					if (request.object.existed()) {
						queryFriendRequest.notEqualTo("objectId", request.object.get("objectId"));
						queryInverseFriendRequest.notEqualTo("objectId", request.object.get("objectId"));
					}

					var query = Parse.Query.or(queryFriendRequest, queryInverseFriendRequest);
					query.find().then(
						function(results) {
							if (results.length > 0) {
								console.log("Friend request already exists.");
								response.error(JSON.stringify({
									code: 1,
									message: "Friend Request already exists."
								}));
							} else {
								response.success();
							}
						},
						function(error) {
							console.log("error when checking for existing relations, allowing to continute");
							response.success();
						}
					);
				}
			},
			function(error) {
				console.log("error when checking for existing relations, allowing to continute");
				response.success();
			}
		);
	} else {
		console.log("Love thyself.");
		response.error(JSON.stringify({
			code: 3,
			message: "User tried to befriend self."
		}));
	}
});

Parse.Cloud.afterSave("POFriendRequest", function(request) {

	if (!request.object.existed()) {
	    var roleQuery = new Parse.Query(Parse.Role);
	    roleQuery.equalTo("name", "user-" + request.user.id);
	    roleQuery.first({ useMasterKey: true }).then(
	    	function(role) {
	            role.relation("users").add(request.object.get("requestedUser"));
	            role.save();
	        },
	        function(error) {
	            console.log("Failed to save role for friend request with error " + error.code + " : " + error.message);
	        }
	    );
	}

});

Parse.Cloud.afterDelete("POFriendRequest", function(request) {
	var requestingUser = request.object.get("requestingUser");
	var requestedUser = request.object.get("requestedUser");

	var queryInverseFriendRequest = new Parse.Query("POFriendRequest");
	queryInverseFriendRequest.equalTo("requestingUser", requestedUser);
	queryInverseFriendRequest.equalTo("requestedUser", requestingUser);

	queryInverseFriendRequest.find().then(
		function(results) {
			Parse.Object.destroyAll().then(
				function() {},
				function(error) {
					console.error("Error deleting inverse friend relations " + error.code + ": " + error.message);
				}
			);
		},
		function(error) {
			console.error("Error finding inverse friend relations " + error.code + ": " + error.message);
		}
	);
});

Parse.Cloud.define("requestedFriend", function(request, response) {

	var pushCallbackCounter = new NetworkUtil.CallbackCounter(1, response);

	var channels = ["user-" + request.params.requested_user];

	var androidPushData = {
		userId: request.user.id,
		userName: request.user.get("displayName")
	};
	PushNotifications.sendAndroidPush(channels, "ca.appcolony.distracteddriver.FRIEND_REQUEST", androidPushData, pushCallbackCounter);

	// var alert = {
	// 	"loc-key": "notification-friend-request",
	// 	"loc-args": [request.user.get("displayName")]
	// };
	// var iOSData = {
	// 	userId: request.user.id
	// };
	// PushNotifications.sendIOSPush(channels, alert, true, "friendRequest", iOSData, pushCallbackCounter);
});
