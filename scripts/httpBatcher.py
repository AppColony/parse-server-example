#!/usr/bin/python

import json,httplib,time
from pprint import pprint

class HttpBatcher:
    def __init__(self, delay, app_id, api_key):
    	self.app_id = app_id
    	self.api_key = api_key
        self.requests = []
        self.delay = delay

    def add_request(self, request):
        self.requests.append(request)
        if len(self.requests) == 50:
            self.send()

    def send(self):
        if len(self.requests) > 0:
            print "Saving"
            pprint(runBatch(self.app_id, self.api_key, self.requests))
            self.requests = []
            time.sleep(self.delay)



def runBatch(app_id, api_key, requests):
	connection = httplib.HTTPSConnection('api.parse.com', 443)
	connection.connect()
	connection.request('POST', '/1/batch', json.dumps({
	       "requests": requests
	     }), {
	       "X-Parse-Application-Id": app_id,
	       "X-Parse-REST-API-Key": api_key,
	       "Content-Type": "application/json"
	     })

	return json.loads(connection.getresponse().read())

def createRequestForBatch(method, path, body):
	request = {
	"method": method,
	"path": path,
	"body": body
	}
	return request