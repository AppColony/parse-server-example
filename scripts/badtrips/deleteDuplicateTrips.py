#!/usr/bin/python

#THIS HASN'T BEEN TESTED AND SHOULD BE GONE OVER BEFORE BEING USED ON PROD

#takes the output of findDuplicateTrips.py (badtrips.csv) and deletes those trips on production
#before doing that it should be checked against the location sever to make sure that its safe to delete those trips

import argparse
import csv
import time

from parse_rest.connection import register
from parse_rest.datatypes import Object
from parse_rest.connection import ParseBatcher
from parse_rest.query import QueryResourceDoesNotExist

# Classes
class POTrip(Object):
	pass

def chunks(l, n):
	for i in xrange(0, len(l), n):
		yield l[i:i+n]

print "reading trips from file"

with open('badTrips.csv', 'rb') as csvfile:
    reader = csv.reader(csvfile)
    global tripsToDeleteList
    tripsToDeleteList = list(reader)[0]

parser = argparse.ArgumentParser(description='Deletes duplicate trips on OneTap. Defaults to dev, pass the correct keys to use another app.')
parser.add_argument('application_key', nargs='?', default='13n15kxQIzdNCIjsnmPQDMxpiM12SC1rUMUqNf9R')
parser.add_argument('rest_api_key', nargs='?', default='2JGL1Z3KbAGpaDlwgEhqOcmFRm5p6Jh3RxdGXs0C')
parser.add_argument('master_key', nargs='?', default='eeAz2ASp8ofbdCLCamqnG7GaIZwI5Jiw94hVGctN')
parser.add_argument('-d', '--delay', type=float, help='The delay between each batch delete', default=2.0)
args = parser.parse_args()

register(args.application_key,
         args.rest_api_key,
         master_key=args.master_key)

batcher = ParseBatcher()

for index, chunk in enumerate(chunks(tripsToDeleteList, 50)):
	print "Deleting", index * 50, "-", min((index+1) * 50 - 1, len(tripsToDeleteList))

	tripChunkToDelete = list()
	for tripToRetrieve in chunk:
		try:
			tripFromServer = POTrip.Query.get(objectId=tripToRetrieve)
			tripChunkToDelete.append(tripFromServer)
		except QueryResourceDoesNotExist:
			print tripToRetrieve + " not found on backend"
		

	batcher.batch_delete(tripChunkToDelete)
	time.sleep(args.delay)