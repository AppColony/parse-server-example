#!/usr/bin/python

import argparse
import time
from pprint import pprint
from sets import Set

from parse_rest.connection import register
from parse_rest.datatypes import Object
from parse_rest.connection import ParseBatcher
from parse_rest.user import User

from batchers import BatchSaver



# Parse Classes
class POFriendRelation(Object):
    pass



parser = argparse.ArgumentParser(description='Updated the channels for all Users on OneTap. Defaults to dev, pass the correct keys to use another app.')
parser.add_argument('application_key', nargs='?', default='nORiB9P52mCaD1Sm72mKQlhLcjgHGjGkpvW7tZO5')
parser.add_argument('rest_api_key', nargs='?', default='0oQwqO36Txv9GeDxkqbi9Fdp3go82BHtNpew18We')
parser.add_argument('master_key', nargs='?', default='R5YWuexk6BUdrCGrkz5HqLDvozv5iAzjw4lUC1AX')
parser.add_argument('-d', '--delay', type=float, help='The delay between each batch save', default=2.0)
parser.add_argument('-u', '--user_id', type=str, help='A specific user id to update')
args = parser.parse_args()



register(args.application_key,
   args.rest_api_key,
   master_key=args.master_key)

batch_saver = BatchSaver(args.delay)



# PUSH NOTIFICATION CHANNELS
# drive-objectid
#     Friend of the user with this objectid and want drive notifications
#     ie. Alice wants drive notifications for Bob she will have the channel drive-bob
# friend-objectid
#     Friend of the user with this objectid but don't want drive notifications
#     ie. Alice does not want drive notifications for Bob she will have the channel friend-bob
# user-objectid
#     The users personal channel for targeting their devices
# region-objectid
#     Corresponds the the region the user is associated to. Each user can only have one.
# community-objectid
#     Corresponds the the community the user is associated to. Each user can only have one.
# ageRange-max
#     Corresponds the the community the user is associated to. Each user can only 



users_channels = {}

def updateUsersChannelsWithDriveUser(user_id, user_id_to_add):
    if user_id not in users_channels:
        users_channels[user_id] = []
    users_channels[user_id].append("drive-" + user_id_to_add)

def updateUsersChannelsWithFriendUser(user_id, user_id_to_add):
    if user_id not in users_channels:
        users_channels[user_id] = []
    users_channels[user_id].append("friend-" + user_id_to_add)

def updateUsersChannelWithDefault(user_id):
    if user_id not in users_channels:
        users_channels[user_id] = []
    users_channels[user_id].insert(0, "user-" + user_id)

def updateUsersChannelWithRegion(user):
    if hasattr(user, 'region'):
        users_channels[user.objectId].append("region-" + user.region.objectId)

def updateUsersChannelWithCommunity(user):
    if hasattr(user, 'community'):
        users_channels[user.objectId].append("community-" + user.community.objectId)

def updateUsersChannelWithAgeRange(user):
    if hasattr(user, 'ageRangeMin'):
        maxAge = ("-" + user.ageRangeMax) if hasattr(user, 'ageRangeMax') else "";
        users_channels[user.objectId].append("ageRange-" + user.ageRangeMin + maxAge)



page_number = 0
friend_relations = POFriendRelation.Query.all().order_by("createdAt").limit(1000)
while len(friend_relations) > 0:
    for friend_relation in friend_relations:
        if hasattr(friend_relation, 'driveNotification') and friend_relation.driveNotification:
            updateUsersChannelsWithDriveUser(friend_relation.user.objectId, friend_relation.friendUser.objectId)
        else:
            updateUsersChannelsWithFriendUser(friend_relation.user.objectId, friend_relation.friendUser.objectId)

    page_number += 1
    friend_relations = POFriendRelation.Query.all().order_by("createdAt").limit(1000).skip(page_number * 1000)



users = User.Query.all().order_by("createdAt").limit(1000)
while len(users) > 0:
    for user in users:
        updateUsersChannelWithDefault(user.objectId)
        updateUsersChannelWithAgeRange(user)
        updateUsersChannelWithRegion(user)
        updateUsersChannelWithCommunity(user)

        if !hasattr(user, 'channels') or Set(user.channels) != Set(users_channels[user.objectId]):
            user.channels = users_channels[user.objectId]
            pprint("SAVING IS DISABLEd BECAUSE IT MARKS EVERY FIELD AS MODIFIED. THIS CAUSES ALL PHONE NUMBERS TO BECOME INVALID.");
            # if args.user_id is None or user.objectId == args.user_id:
            #     batch_saver.add_object_to_save(user)

        last_created_at = user.createdAt

    pprint(last_created_at)
    users = User.Query.filter(createdAt__gt=last_created_at).order_by("createdAt").limit(1000)

batch_saver.save()



pprint(users_channels)
pprint(len(users_channels))
