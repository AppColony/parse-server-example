
var Buffer = require('buffer').Buffer;
var Totals = require('./Totals.js');

// Require and initialize the Twilio module with your credentials
var twilio = require('twilio')('ACbfe5eb075ed1eb84677d623d014e056a', '6b062fdd7bb98153eda4d0b9c18a91e8');

Parse.Cloud.beforeSave(Parse.User, function(request, response) {
    var user = request.object;

    //save the dirty keys for use in afterSave
    user.set("dirtyKeys", user.dirtyKeys());

    var dirtyKeys = user.dirtyKeys();
    if (dirtyKeys.indexOf("phoneNumber") > -1) {
        user.set('phoneNumberVerified', false);
        user.unset('phoneShortCode');
    }

    addChannelForType(dirtyKeys, user, "community");
    addChannelForType(dirtyKeys, user, "region");

    if (dirtyKeys.indexOf("ageRangeMin") > -1) {

        // If the user already set their age range, we need to remove it. Since you can only have 1.
        var channels = user.get("channels");
        if (channels) {
            for (var i = 0; i < channels.length; i++) {
                var channel = channels[i];
                if (channel.indexOf("ageRange") === 0) {
                    channels.splice(i, 1);
                    user.set("channels", channels);
                    break;
                }
            }
        }

        var minAge = user.get("ageRangeMin");
        var maxAge = user.get("ageRangeMax");
        if (minAge) {
            maxAge = maxAge ? ("-" + maxAge) : "";
            user.addUnique("channels", "ageRange-" + minAge + maxAge);
        }
    }

    user.set("dirtyKeys", user.dirtyKeys());

    response.success();
});

function addChannelForType(dirtyKeys, user, type) {
    if (dirtyKeys.indexOf(type) > -1) {

        // If the user already has a channel for this type, we need to remove it. Since you can only be in 1.
        var channels = user.get("channels");
        if (channels) {
            for (var i = 0; i < channels.length; i++) {
                var channel = channels[i];
                if (channel.indexOf(type) === 0) {
                    channels.splice(i, 1);
                    user.set("channels", channels);
                    break;
                }
            }
        }

        var typeValue = user.get(type);
        if (typeValue) {
            user.addUnique("channels", type + "-" + typeValue.id);
        }
    }
}

Parse.Cloud.afterSave(Parse.User, function(request) {
    var user = request.object;
    if (!user.existed()) {
        console.log("added new user");
        Totals.getDailyTotals(new Date(), function(dailyTotals) {
            dailyTotals.increment("users");
            dailyTotals.save();
        });

        Totals.getMonthlyTotals(new Date(), function(monthlyTotals) {
            monthlyTotals.increment("users");
            monthlyTotals.save();
        });

        Totals.getGlobalTotals(function(globalTotals) {
            globalTotals.increment("users");
            globalTotals.save();
        });

        //https://www.parse.com/questions/errors-when-trying-to-set-acls-in-user-beforesave
        var roleACL = new Parse.ACL();
        roleACL.setPublicReadAccess(true);
        var role = new Parse.Role("user-" + user.id, roleACL);
        role.save();

        var userACL = new Parse.ACL(user);
        userACL.setRoleReadAccess("user-" + user.id, true);
        user.setACL(userACL);
        user.addUnique("channels", "user-" + user.id);
        user.save();
    }

    var dirtyKeys = request.object.get("dirtyKeys");

    if (dirtyKeys.indexOf("channels") > -1) {
        var installationQuery = new Parse.Query(Parse.Installation);
        installationQuery.equalTo("user", user);
        installationQuery.find({ useMasterKey: true }).then(
            function(installations) {
                if (installations) {
                    for (var i = 0; i < installations.length; i++) {
                        var installation = installations[i];
                        installation.set("channels", user.get("channels"));
                    };
                    if (installations.length > 0) {
                        Parse.Object.saveAll(installations, {useMasterKey:true});
                    }
                }
            },
            function(error) {
                console.error("Unable to find installation " + error.code + " : " + error.message);
            }
        );
    }

    for (var i in dirtyKeys) {
        var dirtyKey = dirtyKeys[i];
        if (dirtyKey === "facebookId") {

            var facebookId = request.object.get("facebookId")
            var hashedFacebookId = null;
            if (facebookId != null) {

                //load sha256 library
                var jssha = require('./jssha256.js');

                //hash facebook Id
                var digest_hex = jssha.SHA256_hash(facebookId);

                //convert from hex string to base64 string
                hashedFacebookId = new Buffer(digest_hex, 'hex').toString('base64');

            }
            //public user object
            var POPublicUser = Parse.Object.extend("POPublicUser");

            //find the current public user
            var query = new Parse.Query(POPublicUser);
            query.equalTo("user", request.object);
            query.first().then(function(object) {

                //save public user with hashed phone number for search
                var publicUser = object;
                if (!publicUser) {
                    publicUser = new POPublicUser();
                    publicUser.set("user", request.object);
                }
                publicUser.set("facebookIdHashed", hashedFacebookId);
                publicUser.save(null, {useMasterKey: true});

            });
        }
    }
});

Parse.Cloud.define("verifyPhoneShortCode", function(request, response) {

    var userPointer = new Parse.User({
        id: request.params.userId
    });
    console.log("Saw " + request.params.userId + ". ShortCode: " + request.params.phoneShortCode);

    userPointer.fetch({
        success: function(user) {
            var serverShortCode = user.get("phoneShortCode");

            if (serverShortCode == request.params.phoneShortCode) {

                user.set("phoneNumberVerified", true);
                user.save(null, {
                    success: function() {

                        //load sha256 library
                        var jssha = require('./jssha256.js');

                        //hash phone number
                        var digest_hex = jssha.SHA256_hash(user.get("phoneNumber"));

                        //convert from hex string to base64 string
                        var hashedPhoneNumber = new Buffer(digest_hex, 'hex').toString('base64');

                        //public user object
                        var POPublicUser = Parse.Object.extend("POPublicUser");

                        var queryPublicUsersWithPhone = new Parse.Query(POPublicUser);
                        queryPublicUsersWithPhone.equalTo("phoneNumberHashed", hashedPhoneNumber);
                        queryPublicUsersWithPhone.find(function(publicUsers) {

                            //null out any existing users with this phone number
                            for (var i = 0; i < publicUsers.length; i++) {
                                publicUsers[i].set("phoneNumberHashed", null);
                            }
                            return Parse.Object.saveAll(publicUsers, {useMasterKey: true});

                        }).then(function(result) {

                            //find all users with this phone number
                            var queryUsersWithPhone = new Parse.Query(Parse.User);
                            queryUsersWithPhone.equalTo("phoneNumber", user.get("phoneNumber"));
                            return queryUsersWithPhone.find({useMasterKey:true});

                        }).then(function(usersWithPhone) {

                            //unverify all the users with this phone number except for the current one
                            for (var i = 0; i < usersWithPhone.length; i++) {
                                if (usersWithPhone[i].id != user.id) {
                                    usersWithPhone[i].set("phoneNumberVerified", false);
                                }
                            }
                            return Parse.Object.saveAll(usersWithPhone, {useMasterKey: true});

                        }).then(function(result) {

                            //find the current public user
                            var query = new Parse.Query(POPublicUser);
                            query.equalTo("user", userPointer);
                            return query.first();

                        }).then(function(object) {

                            //save public user with hashed phone number for search
                            var publicUser = object;
                            if (!publicUser) {
                                publicUser = new POPublicUser();
                                publicUser.set("user", userPointer);
                            }
                            publicUser.set("phoneNumberHashed", hashedPhoneNumber);
                            return publicUser.save(null, {useMasterKey:true});

                        }).then(function() {

                            response.success();

                        }, function(error) {

                            console.error("Error when setting  " + error.code + " : " + error.message);
                            response.error("Error saving phone number");

                        });

                    },
                    error: function(myObject, error) {
                        console.error("Error when setting phoneNumberVerified " + error.code + " : " + error.message);
                        response.error("Error when setting phoneNumberVerified");
                    }
                });
            } else {
                console.error("Invalid shortcode sent for " + request.params.userId + ". Expecting: " + serverShortCode + " Recieved: " + request.params.phoneShortCode);
                response.error("Invalid shortcode sent");
            }
        },
        error: function(myObject, error) {
            console.error("Unable to find user to verify " + error.code + " : " + error.message);
            response.error("Unable to find user to verify");
        }
    });
});

Parse.Cloud.define("sendPhoneShortCode", function(request, response) {
    Parse.Cloud.useMasterKey();

    console.log("user id: " + request.params.userId);
    var userPointer = new Parse.User({
        id: request.params.userId
    });
    userPointer.fetch({
        success: function(user) {
            console.log("user: " + user);

            var phoneShortCode = Math.floor((Math.random() * 900000) + 100000);
            user.set("phoneShortCode", phoneShortCode);
            user.save();

            var formattedPhoneShortCode = phoneShortCode.toString()
            formattedPhoneShortCode = formattedPhoneShortCode.slice(0, 3) + " " + formattedPhoneShortCode.slice(3);

            //TODO send shortcode from twilio
            twilio.sendSMS({
                From: "+15873170710",
                To: user.get("phoneNumber"),
                Body: "Thanks for using OneTap!  Your code is " + formattedPhoneShortCode
            }, {
                success: function(httpResponse) {
                    response.success();
                },
                error: function(httpResponse) {
                    response.error("unable to send shortcode from twilio: " + httpResponse);
                }
            });

        },
        error: function(myObject, error) {
            console.error("Unable to find user to send shortcode " + error.code + " : " + error.message);
            response.error("Unable to find user to verify");
        }
    });
});
