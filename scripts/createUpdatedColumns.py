#!/usr/bin/python

import argparse
import time

from parse_rest.connection import register
from parse_rest.datatypes import Object
from parse_rest.connection import ParseBatcher
from parse_rest.user import User

from batchers import BatchSaver



# Parse Classes
class POFriendRelation(Object):
    pass

class POFriendRequest(Object):
    pass

class POPublicUser(Object):
    pass



parser = argparse.ArgumentParser(description='Creates updated columns on Parse for OneTap. Defaults to dev, pass the correct keys to use another app.')
parser.add_argument('application_key', nargs='?', default='nORiB9P52mCaD1Sm72mKQlhLcjgHGjGkpvW7tZO5')
parser.add_argument('rest_api_key', nargs='?', default='0oQwqO36Txv9GeDxkqbi9Fdp3go82BHtNpew18We')
parser.add_argument('master_key', nargs='?', default='R5YWuexk6BUdrCGrkz5HqLDvozv5iAzjw4lUC1AX')
parser.add_argument('-d', '--delay', type=float, help='The delay between each batch save', default=2.0)
args = parser.parse_args()



register(args.application_key,
   args.rest_api_key,
   master_key=args.master_key)

batch_saver = BatchSaver(args.delay)


# POFriendRelation
# userId and friendUserId
# Makes you think it contains a id string when its actually a user object.
# Possible Solution
# Create new columns called user and friendUser. Add a before save that assign the value in the old column to the new column or vice versa. Then when enough people have the new version of the app, we can delete the old columns.

print 'POFriendRelation'

page_number = 0
friend_relations = POFriendRelation.Query.all().order_by("createdAt").limit(1000)
while len(friend_relations) > 0:
    friend_relations_to_save = []
    for friend_relation in friend_relations:
        batch_saver.add_object_to_save(friend_relation)

    page_number += 1
    friend_relations = POFriendRelation.Query.all().order_by("createdAt").limit(1000).skip(page_number * 1000)



# POFriendRequest
# requested_user and requesting_user
# It isn't following the camelCase naming convention.
# Makes more work for the iOS app to do name conversions.
# Possible Solution
# Create new columns called requestedUser and requestingUser. Add a before save that assign the value in the old column to the new column or vice versa. Then when enough people have the new version of the app, we can delete the old columns.

print 'POFriendRequest'

page_number = 0
friend_requests = POFriendRequest.Query.all().order_by("createdAt").limit(1000)
while len(friend_requests) > 0:
    friend_requests_to_save = []
    for friend_request in friend_requests:
        batch_saver.add_object_to_save(friend_request)

    page_number += 1
    friend_requests = POFriendRequest.Query.all().order_by("createdAt").limit(1000).skip(page_number * 1000)



# POPublicUser
# userId
# Should be the user object, not just the string id. Since users have an ACL, anyone that doesn't have permission will only get a user object back with a objectId.
# Possible Solution
# Create a new column called user. Add a before save that assign the value in the old column to the new column or vice versa. Then when enough people have the new version of the app, we can delete the old columns and the beforeSave.

print 'POPublicUser'

page_number = 0
public_users = POPublicUser.Query.all().order_by("createdAt").limit(1000)
while len(public_users) > 0:
    public_users_to_save = []
    for public_user in public_users:
        batch_saver.add_object_to_save(public_user)

    page_number += 1
    public_users = POPublicUser.Query.all().order_by("createdAt").limit(1000).skip(page_number * 1000)



# POTrip
# userId
# Should be the user object, not just the string id.
# Possible Solution
# Create a new column called user. Add a before save that assign the value in the old column to the new column or vice versa. Then when enough people have the new version of the app, we can delete the old columns and the beforeSave.

batch_saver.save()
