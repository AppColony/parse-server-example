#!/usr/bin/python

#takes the exported trips from parse POTRip.json and outputs a csv of trips that should be eliminated.

import json
import time
import operator
import dateutil.parser
import csv

#load trips from json
print "loading trips from json"
json_trips=open('POTrip.json')
json_data = json.load(json_trips)
json_trips.close()
trips = json_data["results"]
print "loaded " + str(len(trips)) + " trips"

users = set()
userTrips = dict()
noUserCount = 0

for trip in trips:
	try:
		userId = trip["userId"]
		users.add(userId)

		if userId in userTrips:
			userTrips[userId].append(trip)
		else:
			userTrips[userId] = list()
			userTrips[userId].append(trip)

	except KeyError: 
		# print "trip "+trip["objectId"] + " has no user"
		noUserCount += 1
		pass

print "found " + str(len(users)) + " users"
print "found " + str(noUserCount) + " trips without a user"

print "sorting trips per user by startTime"

#sort trips in lists
for userId in userTrips:
	userTrips.get(userId).sort(key=operator.itemgetter('startTime'), reverse=True) #reverse sort, puts the newest first

print "done sorting trips per user by startTime"

tripsToDelete = set()
usersWithtripsToDelete = dict()

print "finding duplicate Trips"
for userId in userTrips:
	userTripsForUser = userTrips.get(userId)
	for i in range(len(userTripsForUser)):
		if i != 0:
			itemOne = userTripsForUser[i-1]
			itemTwo = userTripsForUser[i]
			if itemOne.get('startTime') == itemTwo.get('startTime'):
				if userId not in usersWithtripsToDelete:
					usersWithtripsToDelete[userId] = list()
				
				if dateutil.parser.parse(itemOne.get('createdAt')) < dateutil.parser.parse(itemTwo.get('createdAt')):
					tripsToDelete.add(itemOne.get('objectId'))
					usersWithtripsToDelete[userId].append(itemOne.get('objectId'))
				else:
					tripsToDelete.add(itemTwo.get('objectId'))
					usersWithtripsToDelete[userId].append(itemTwo.get('objectId'))


print "done finding duplicate trips"

#show users with bad trips
# for userId in usersWithtripsToDelete:
# 	print userId + " " + str(len(usersWithtripsToDelete[userId]))

print "found " + str(len(tripsToDelete)) + " trips to delete"


badTripsCsv = 'badTrips.csv'


writer=csv.writer(open(badTripsCsv,'wb'))
writer.writerow(list(tripsToDelete))

print "wrote to " + badTripsCsv


