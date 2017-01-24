Parse.Cloud.beforeSave("POPublicUser", function(request, response) {

    var user = request.object.get("user");
    var userId = request.object.get("userId");

    if (user == null) {
        request.object.set("user", new Parse.User({
            id: userId
        }));
    }
    else if (userId == null) {
        request.object.set("userId", user.id);
    }

    response.success();
});

Parse.Cloud.afterSave("POPublicUser", function(request) {

    var user = request.object;

    var POPublicUser = Parse.Object.extend("POPublicUser");

    var facebookId = user.get("facebookIdHashed");

    if (facebookId) {
        var query = new Parse.Query(POPublicUser);
        query.equalTo("facebookIdHashed", facebookId);
        query.find({ useMasterKey: true }).then(
            function(results) {
                if (results.length > 0) {
                    for (var i = 0; i < results.length; i++) {
                        if (user.id != results[i].id) {
                            results[i].set("facebookIdHashed", null);
                            results[i].save(null, {useMasterKey: true});
                        }
                    }
                }
            }
        );
    }
});
