
exports.sendAndroidPush = function(channels, action, data, callbackCounter) {
    var installationQuery = new Parse.Query(Parse.Installation);
    installationQuery.equalTo("deviceType", "android");
    installationQuery.containsAll("channels", channels);

    var pushData = { action: action };
    if (data) {
        for (var key in data) {
            pushData[key] = data[key];
        };
    }

    sendPush(installationQuery, pushData, callbackCounter);
}

exports.sendIOSPush = function(channels, alert, contentAvailable, category, data, callbackCounter) {
    var installationQuery = new Parse.Query(Parse.Installation);
    installationQuery.equalTo("deviceType", "ios");
    installationQuery.containsAll("channels", channels);

    var pushData = { aps: {} };

    if (alert) {
        pushData["aps"]["alert"] = alert;
        pushData["aps"]["sound"] = "default";
    }

    if (contentAvailable) {
        pushData["aps"]["content-available"] = 1;
    }

    if (category) {
        pushData["aps"]["category"] = category;
    }

    if (data) {
        for (var key in data) {
            pushData[key] = data[key];
        };
    }

    console.log(pushData);

    sendPush(installationQuery, pushData, callbackCounter);
}

function sendPush(query, data, callbackCounter) {
    Parse.Push.send({
        where: query,
        data: data
    }, { useMasterKey: true }).then(
        function(){
            console.log('Push sent!');
        }, function(error) { // error
            console.error("Got an error " + error.code + " : " + error.message);
        }
    );  
}
