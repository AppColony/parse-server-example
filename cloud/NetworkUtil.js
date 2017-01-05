
var CallbackCounter = function(limit, response) {
    this.limit = limit;
    this.response = response;

    this.success = function() {
        if (--this.limit == 0) {
            this.response.success();
        }
    };

    this.error = function(error) {
        var errorMessage = "An error occurred " + error.code + " : " + error.message;
        console.error(errorMessage);
        this.response.error(errorMessage);
    };
}

exports.CallbackCounter = CallbackCounter;

