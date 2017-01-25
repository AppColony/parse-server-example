

Parse.Cloud.beforeSave(Parse.Installation, function(request, response) {

    var installation = request.object;
    var dirtyKeys = installation.dirtyKeys();

    if (dirtyKeys.indexOf("user") > -1) {
        var userPointer = new Parse.User({
            id: installation.get("user").id
        });

        userPointer.fetch({ useMasterKey: true }).then(
            function(user) {
                installation.set("channels", user.get("channels"));
                response.success();
            },
            function(myObject, error) {
                console.error("Unable to find user " + userPointer.id + " " + error.code + " : " + error.message);
                response.error();
            }
        );
    } else {
        response.success();
    }
});