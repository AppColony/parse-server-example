var FriendRelation = require('cloud/POFriendRelation.js');
var NetworkUtil = require('cloud/NetworkUtil.js');
var PushNotifications = require('cloud/PushNotifications.js');

Parse.Cloud.define("startedDriving", function(request, response) {
    var pushCallbackCounter = new NetworkUtil.CallbackCounter(3, response);

    var driveChannel = "drive-" + request.user.id;
    var friendChannel = "friend-" + request.user.id
    var data = { userId: request.user.id };

    PushNotifications.sendAndroidPush([driveChannel], "ca.appcolony.distracteddriver.STARTED_DRIVING", data, pushCallbackCounter);

    var alert = {
        "loc-key": "notification-started-driving",
        "loc-args": [request.user.get("displayName")]
    };
    PushNotifications.sendIOSPush([driveChannel], alert, true, "startedDriving", data, pushCallbackCounter);

    PushNotifications.sendIOSPush([friendChannel], null, true, "startedDriving", data, pushCallbackCounter);
});

Parse.Cloud.define("stoppedDriving", function(request, response) {
    var pushCallbackCounter = new NetworkUtil.CallbackCounter(2, response);

    var driveChannel = "drive-" + request.user.id;
    //if request.user.id is null in the above line then it is most likely because they have an old version of the app.  Som older versions of 
    //parse seem to have this issue, see: http://stackoverflow.com/questions/31702926/cloud-code-request-user-is-null-when-called-from-one-activity-but-not-the-previ
    var friendChannel = "friend-" + request.user.id
    var data = { userId: request.user.id };

    PushNotifications.sendAndroidPush([driveChannel], "ca.appcolony.distracteddriver.STOPPED_DRIVING", data, pushCallbackCounter);
    PushNotifications.sendIOSPush([driveChannel, friendChannel], null, true, "stoppedDriving", data, pushCallbackCounter);
});

Parse.Cloud.define("sendEmergencyPush", function(request, response) {
    var pushCallbackCounter = new NetworkUtil.CallbackCounter(2, response);

    var channels = ["user-" + request.params.userId];
    var data = { userId: request.user.id };

    PushNotifications.sendAndroidPush(channels, "ca.appcolony.distracteddriver.EMERGENCY", data, pushCallbackCounter);

    var alert = {
        "loc-key": "notification-emergency",
        "loc-args": [request.user.get("displayName")]
    };
    PushNotifications.sendIOSPush(channels, alert, true, "emergency", null, pushCallbackCounter);
});
