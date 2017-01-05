#!/usr/bin/python

import argparse
import time
import sys
from pprint import pprint

import json,httplib

from parse_rest.connection import register
from parse_rest.datatypes import Object
from parse_rest.user import User

from batchers import BatchDeleter



# Parse Classes
class POFriendRelation(Object):
    pass



parser = argparse.ArgumentParser(description='Remove duplicate friend relations for all Users on OneTap. Defaults to dev, pass the correct keys to use another app.')
parser.add_argument('application_key', nargs='?', default='nORiB9P52mCaD1Sm72mKQlhLcjgHGjGkpvW7tZO5')
parser.add_argument('rest_api_key', nargs='?', default='0oQwqO36Txv9GeDxkqbi9Fdp3go82BHtNpew18We')
parser.add_argument('master_key', nargs='?', default='R5YWuexk6BUdrCGrkz5HqLDvozv5iAzjw4lUC1AX')
parser.add_argument('-d', '--delay', type=float, help='The delay between each batch save', default=2.0)
args = parser.parse_args()



register(args.application_key,
   args.rest_api_key,
   master_key=args.master_key)

batch_deleter = BatchDeleter(args.delay)



print "Loading Friend Relations"

friend_relation_hashes = []
user_ids_modified = []

page_number = 0
friend_relations = POFriendRelation.Query.all().order_by("createdAt").limit(1000)
while len(friend_relations) > 0:
    for friend_relation in friend_relations:
        friend_relation_hash = friend_relation.user.objectId + " -> " + friend_relation.friendUser.objectId
        if friend_relation_hash in friend_relation_hashes:
            batch_deleter.add_object_to_delete(friend_relation)

            if friend_relation.user.objectId not in user_ids_modified:
                user_ids_modified.append(friend_relation.user.objectId)
        else:
            friend_relation_hashes.append(friend_relation_hash)

    page_number += 1
    friend_relations = POFriendRelation.Query.all().order_by("createdAt").limit(1000).skip(page_number * 1000)

batch_deleter.delete()

pprint(user_ids_modified)
