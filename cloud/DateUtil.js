exports.getMinutesBetweenDates = function(startDate, endDate) {
	var diff = endDate.getTime() - startDate.getTime();
	return (diff / 60000);
}
exports.getDaysBetweenDates = function(startDate, endDate) {
	var diff = endDate.getTime() - startDate.getTime();
	return Math.round(Math.abs(diff / 86400000)); // 86400000 == 24*60*60*1000 == hours*minutes*seconds*milliseconds
}
//from http://stackoverflow.com/questions/2536379/difference-in-months-between-two-dates-in-javascript/15158873#15158873
exports.getMonthsBetweenDates = function(startDate, endDate) {
	var year1=startDate.getFullYear();
	var year2=endDate.getFullYear();
	var month1=startDate.getMonth();
	var month2=endDate.getMonth();
	if(month1===0){ //Have to take into account
	  month1++;
	  month2++;
	}
	return Math.abs((year2 - year1) * 12 + (month2 - month1)); 
}