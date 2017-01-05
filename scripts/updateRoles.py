#!/usr/bin/python

import argparse
import time
import sys
from pprint import pprint

import json,httplib

from parse_rest.connection import register
from parse_rest.datatypes import Object
from parse_rest.user import User
from parse_rest.role import Role



class RoleOperation:
    def __init__(self, role, user_ids):
        self.role = role
        self.existing_user_ids = list(user_ids)
        self.new_user_ids = []
        self.added_user_ids = []
        self.removed_user_ids = list(user_ids)

    def add_new_user_id(self, user_id):
        self.new_user_ids.append(user_id)

        if user_id in self.removed_user_ids:
            self.removed_user_ids.remove(user_id)

        if user_id not in self.existing_user_ids:
            self.added_user_ids.append(user_id)

    def save(self):
        if len(self.added_user_ids) > 0:
            self.__save_added_user_ids()
        if len(self.removed_user_ids) > 0:
            self.__save_removed_user_ids()

    def __save_added_user_ids(self):
        json_object = self.__json_object_for_operation_and_user_ids("AddRelation", self.added_user_ids)
        self.__save_with_json_object(json_object)

    def __save_removed_user_ids(self):
        json_object = self.__json_object_for_operation_and_user_ids("RemoveRelation", self.removed_user_ids)
        self.__save_with_json_object(json_object)

    def __save_with_json_object(self, json_object):
        pprint(json_object)

        connection = httplib.HTTPSConnection('api.parse.com', 443)
        connection.connect()
        connection.request('PUT', '/1/roles/' + self.role.objectId, json.dumps(json_object), {
               "X-Parse-Application-Id": args.application_key,
               "X-Parse-REST-API-Key": args.rest_api_key,
               "X-Parse-Master-Key": args.master_key,
               "Content-Type": "application/json"
            })
        pprint(json.loads(connection.getresponse().read()))
        time.sleep(args.delay/50)

    def __json_object_for_operation_and_user_ids(self, operation, user_ids):
        return {"users": {"__op": operation,
                          "objects": [self.__json_object_for_user_id(user_id) for user_id in user_ids]
                         }
               }

    def __json_object_for_user_id(self, user_id):
        return {"__type": "Pointer", "className": "_User", "objectId": user_id}



# Parse Classes
class POFriendRelation(Object):
    pass

class POFriendRequest(Object):
    pass



parser = argparse.ArgumentParser(description='Updated the roles for all Users on OneTap. Defaults to dev, pass the correct keys to use another app.')
parser.add_argument('application_key', nargs='?', default='nORiB9P52mCaD1Sm72mKQlhLcjgHGjGkpvW7tZO5')
parser.add_argument('rest_api_key', nargs='?', default='0oQwqO36Txv9GeDxkqbi9Fdp3go82BHtNpew18We')
parser.add_argument('master_key', nargs='?', default='R5YWuexk6BUdrCGrkz5HqLDvozv5iAzjw4lUC1AX')
parser.add_argument('-d', '--delay', type=float, help='The delay between each batch save', default=2.0)
parser.add_argument('-u','--user_ids', nargs='+', help='Specific users to update')
parser.add_argument('--new-roles', dest='new_roles', action='store_true', help='Indicates that the roles are new', default=False)
args = parser.parse_args()



register(args.application_key,
   args.rest_api_key,
   master_key=args.master_key)



role_names_to_update = []
if args.user_ids is not None:
    role_names_to_update = ["user-" + user_id for user_id in args.user_ids]



role_operations_by_user_id = {}

def update_role_operation(user_id, new_user_id):
    if user_id in role_operations_by_user_id:
        role_operation = role_operations_by_user_id[user_id]
        role_operation.add_new_user_id(new_user_id)



print "Loading Existing Roles"

page_number = 0
roles = Role.Query.all().order_by("createdAt").limit(1000)
while len(roles) > 0:
    for role in roles:
        if len(role_names_to_update) == 0 or role.name in role_names_to_update:
            user_ids = []
            if not args.new_roles:
                user_ids = [user.objectId for user in User.Query.filter(users__relatedTo=role).limit(1000)]
                sys.stdout.write('.')
                sys.stdout.flush()
                time.sleep(args.delay/50)

            user_id = role.name.replace("user-", "")
            role_operations_by_user_id[user_id] = RoleOperation(role, user_ids)

    page_number += 1
    roles = Role.Query.all().order_by("createdAt").limit(1000).skip(page_number * 1000)

if not args.new_roles:
    print ""



print "Updating Roles With Friend Relations"

page_number = 0
friend_relations = POFriendRelation.Query.all().order_by("createdAt").limit(1000)
while len(friend_relations) > 0:
    for friend_relation in friend_relations:
        update_role_operation(friend_relation.user.objectId, friend_relation.friendUser.objectId)

    page_number += 1
    friend_relations = POFriendRelation.Query.all().order_by("createdAt").limit(1000).skip(page_number * 1000)



print "Updating Roles With Friend Requests"

page_number = 0
friend_requests = POFriendRequest.Query.all().order_by("createdAt").limit(1000)
while len(friend_requests) > 0:
    for friend_request in friend_requests:
        update_role_operation(friend_request.requestingUser.objectId, friend_request.requestedUser.objectId)

    page_number += 1
    friend_requests = POFriendRequest.Query.all().order_by("createdAt").limit(1000).skip(page_number * 1000)



print "Saving Roles"

for role_operation in role_operations_by_user_id.itervalues():
    role_operation.save()
