var ColumnUtil = require('cloud/ColumnUtil.js');

Parse.Cloud.beforeSave("POFriendRelation", function(request, response) {
	ColumnUtil.mirrorColumnsForObject(request.object, "friendUserId", "friendUser");
	ColumnUtil.mirrorColumnsForObject(request.object, "userId", "user");

	var friendUser = request.object.get("friendUser");

	var saveOptions = {
		success: function(user) {
			response.success();
		},
		error: function(user, error) {
			response.error("Unable to save the user");
  		}
	}

	function addAndRemoveChannels(addedChannel, removedChannel) {
		request.user.remove("channels", removedChannel);
		request.user.save(null, {
            success: function(user) {
				request.user.addUnique("channels", addedChannel);
				request.user.save(null, saveOptions);
			},
			error: function(user, error) {
				response.error("Unable to save the user");
			}
        });
	}

	function updateChannelsIfNeeded() {
		if (request.object.dirtyKeys().indexOf("driveNotification") > -1 && request.user) {
			var driveChannel = "drive-" + friendUser.id;
			var friendChannel = "friend-" + friendUser.id;

			if (request.object.get("driveNotification")) {
				addAndRemoveChannels(driveChannel, friendChannel);
			} else {
				addAndRemoveChannels(friendChannel, driveChannel);
			}
		} else {
			response.success();
		}
	}

	// when the friend relation is new
	if (!request.object.existed()) {
		// give the requesting user access to the requested user since the inverse already exists
		if (request.user.id != friendUser.id) {
		    var roleQuery = new Parse.Query(Parse.Role);
		    roleQuery.equalTo("name", "user-" + request.user.id);
		    roleQuery.first({
		        success: function(role) {
		            Parse.Cloud.useMasterKey();
		            role.relation("users").add(friendUser);
		            role.save(null, {
		            	success: function(user) {
							updateChannelsIfNeeded();
						},
						error: function(user, error) {
							response.error("Unable to save the role");
  						}
		            });
		        },
		        error: function(error) {
		            console.log("Failed to save role for friend relation with error " + error.code + " : " + error.message);
					response.error("Unable to find the role");
		        },
		        useMasterKey:true
		    });
		} else {
			response.success();
		}
	}
	else {
		updateChannelsIfNeeded();
	}
});

Parse.Cloud.afterSave("POFriendRelation", function(request) {
	var user = request.object.get("user");
	var friendUser = request.object.get("friendUser");

	//destroy all friend requests associated with a relationship when the relationship is created
	var query = new Parse.Query("POFriendRequest");
	query.equalTo("requestingUser", user);
	query.equalTo("requestedUser", friendUser);
	query.find({
		success: function(results) {
			if (results.length > 0) {
				for (var i = 0; i < results.length; i++) {
					results[i].destroy();
				}
			}

			var friendQuery = new Parse.Query("POFriendRequest");
			friendQuery.equalTo("requestingUser", friendUser);
			friendQuery.equalTo("requestedUser", user);
			friendQuery.find({
				success: function(results) {
					if (results.length > 0) {
						for (var i = 0; i < results.length; i++) {
							results[i].destroy();
						}
					}
				},
				error: function(error) {
					console.log("error when destroying friend request");
				}
			});
		},
		error: function(error) {
			console.log("error when destroying friend request");
		}
	});
});


Parse.Cloud.afterDelete("POFriendRelation", function(request) {

	//when someone removes a friend we need to delete read access both ways.
	var userPointer = request.object.get("user");
	var friendUserPointer = request.object.get("friendUser");

	userPointer.fetch({
		success: function(user) {
		    var roleQuery = new Parse.Query(Parse.Role);
		    roleQuery.equalTo("name", "user-" + user.id);
		    roleQuery.first({
		        success: function(role) {
		            Parse.Cloud.useMasterKey();
		            role.relation("users").remove(friendUserPointer);
		            role.save();
		        },
		        error: function(error) {
		            console.log("Failed to remove role for friend relation with error " + error.code + " : " + error.message);
		        },
		        useMasterKey:true
		    });
			user.remove("channels", "friend-" + friendUserPointer.id);
			user.save(null, {useMasterKey:true});
		},
		error: function(myObject, error) {
			console.error("Unable to find user " + userPointer.id + " " + error.code + " : " + error.message);
		},
		useMasterKey: true
	});
});
