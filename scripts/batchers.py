#!/usr/bin/python

import time

from parse_rest.datatypes import Object
from parse_rest.connection import ParseBatcher



class BatchSaver:
    def __init__(self, delay):
        self.batcher = ParseBatcher()
        self.objects_to_save = []
        self.delay = delay
        self.save_count = 0

    def add_object_to_save(self, object_to_save):
        self.objects_to_save.append(object_to_save)
        if len(self.objects_to_save) == 50:
            self.save()

    def save(self, delay=True):
        if len(self.objects_to_save) > 0:
            print "Saving", self.save_count+1, "-", self.save_count+len(self.objects_to_save)
            self.batcher.batch_save(self.objects_to_save)
            self.save_count += len(self.objects_to_save)
            self.objects_to_save = []
            if delay:
                time.sleep(self.delay)



class BatchDeleter:
    def __init__(self, delay):
        self.batcher = ParseBatcher()
        self.objects_to_delete = []
        self.delay = delay
        self.delete_count = 0

    def add_object_to_delete(self, object_to_delete):
        self.objects_to_delete.append(object_to_delete)
        if len(self.objects_to_delete) == 50:
            self.delete()

    def delete(self, delay=True):
        if len(self.objects_to_delete) > 0:
            print "Deleting", self.delete_count+1, "-", self.delete_count+len(self.objects_to_delete)
            self.batcher.batch_delete(self.objects_to_delete)
            self.delete_count += len(self.objects_to_delete)
            self.objects_to_delete = []
            if delay:
                time.sleep(self.delay)
