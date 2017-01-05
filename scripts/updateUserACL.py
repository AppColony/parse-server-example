#!/usr/bin/python

import argparse
import time
from pprint import pprint

from parse_rest.connection import register
from parse_rest.datatypes import Object
from parse_rest.user import User
from parse_rest.datatypes import ACL
from parse_rest.role import Role

from batchers import BatchSaver



parser = argparse.ArgumentParser(description='Updated the ACL for all Users on OneTap. Defaults to dev, pass the correct keys to use another app.')
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



pprint("Loading Roles")

role_names = []
roles = Role.Query.all().order_by("createdAt").limit(1000)
while len(roles) > 0:
    for role in roles:
        role_names.append(role.name)
        last_created_at = role.createdAt

    pprint(last_created_at)
    roles = Role.Query.filter(createdAt__gt=last_created_at).order_by("createdAt").limit(1000)



print "Found", len(role_names), "roles"



pprint("Loading User")

users_count = 0
users = User.Query.all().order_by("createdAt").limit(1000)
while len(users) > 0:
    for user in users:
        if args.user_id is None or args.user_id == user.objectId:
            role_name = "user-" + user.objectId
            
            if role_name not in role_names:
                print "Creating role", role_name
                role = Role(name=role_name)
                role.ACL = ACL()
                role.ACL.set_default(read=True)
                batch_saver.add_object_to_save(role)

                user.ACL = ACL({user.objectId: {'read' : True, 'write': True}})
                user.ACL.set_role(role_name, read=True, write=False)
                batch_saver.add_object_to_save(user)

        last_created_at = user.createdAt

    users_count += len(users)
    pprint(last_created_at)
    users = User.Query.filter(createdAt__gt=last_created_at).order_by("createdAt").limit(1000)

batch_saver.save(delay=False)

print "Found", users_count, "users"
