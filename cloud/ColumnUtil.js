exports.mirrorColumnsForObject = function(object, key1, key2) {
    var value1 = object.get(key1);
    var value2 = object.get(key2);

    if (value1 == null) {
        object.set(key1, value2);
    }
    else if (value2 == null) {
        object.set(key2, value1);
    }
}
