#!/usr/bin/python

# Data files from http://www.unece.org/cefact/locode/welcome.html

import argparse
import csv
import time

from parse_rest.connection import register
from parse_rest.datatypes import Object
from parse_rest.connection import ParseBatcher



# Classes
class Region(Object):
    pass



def chunks(l, n):
    for i in xrange(0, len(l), n):
        yield l[i:i+n]



parser = argparse.ArgumentParser(description='Create Regions on Parse for OneTap. Defaults to dev, pass the correct keys to use another app.')
parser.add_argument('application_key', nargs='?', default='nORiB9P52mCaD1Sm72mKQlhLcjgHGjGkpvW7tZO5')
parser.add_argument('rest_api_key', nargs='?', default='0oQwqO36Txv9GeDxkqbi9Fdp3go82BHtNpew18We')
parser.add_argument('master_key', nargs='?', default='R5YWuexk6BUdrCGrkz5HqLDvozv5iAzjw4lUC1AX')
parser.add_argument('-d', '--delay', type=float, help='The delay between each batch save', default=2.0)
args = parser.parse_args()



register(args.application_key,
         args.rest_api_key,
         master_key=args.master_key)



# Load all the country codes
country_codes = set()
file_names = ['data/2014-2 UNLOCODE CodeListPart1.csv', 'data/2014-2 UNLOCODE CodeListPart2.csv', 'data/2014-2 UNLOCODE CodeListPart3.csv']
for file_name in file_names:
    with open(file_name, 'rb') as csvfile:
        reader = csv.reader(csvfile, delimiter=',', quotechar='"')
        for row in reader:
            country_codes.add(row[1])



# Create regions for countries that have subdivisions
regions = []
with open('data/2014-2 SubdivisionCodes.csv', 'rb') as csvfile:
    reader = csv.reader(csvfile, delimiter=',', quotechar='"')
    for row in reader:
        region = Region(countryISOCode=row[0], regionISOCode=row[1])
        regions.append(region)
        country_codes.discard(row[0])


# Create regions for countries that dont have subdivisions
for country_code in country_codes:
    region = Region(countryISOCode=country_code)
    regions.append(region)



# Save all the created regions to parse
batcher = ParseBatcher()
if len(regions) > 0:
    for index, chunk in enumerate(chunks(regions, 50)):
        print "Saving", index * 50, "-", min((index+1) * 50 - 1, len(regions))
        # batcher.batch_save(chunk)
        time.sleep(args.delay)

