'use strict';

const CONSTANTS = require('../lib/constants');
const CONVERSATION_TYPE = CONSTANTS.CONVERSATION_TYPE;
const SKIP_FIELDS = CONSTANTS.SKIP_FIELDS;

module.exports = function(dependencies, lib) {

  const mongoose = dependencies('db').mongo.mongoose;
  const Conversation = mongoose.model('ChatConversation');
  const ensureObjectId = require('./utils')(dependencies).ensureObjectId;

  return {
    getConversationByCollaboration,
    updateConversation
  };

  function getConversationByCollaboration(collaborationTuple, callback) {
    Conversation.findOne({type: CONVERSATION_TYPE.COLLABORATION, collaboration: collaborationTuple}).populate('members', SKIP_FIELDS.USER).exec(callback);
  }

  function updateConversation(collaborationTuple, modifications, callback) {

    let mongoModifications = {};

    if (modifications.newMembers) {
      mongoModifications.$addToSet = {
        members: {
          $each: modifications.newMembers.map(ensureObjectId)
        }
      };
    }

    if (modifications.deleteMembers) {
      mongoModifications.$pullAll = {
        members: modifications.deleteMembers.map(ensureObjectId)
      };
    }

    if (modifications.title) {
      mongoModifications.$set = {name: modifications.title};
    }

    Conversation.findOneAndUpdate({type: CONVERSATION_TYPE.COLLABORATION, collaboration: collaborationTuple}, mongoModifications, (err, conversation) => {
      if (err) {
        return callback(err);
      }

      if (mongoModifications.$addToSet) {
        lib.conversation.markAllAsRead(mongoModifications.$addToSet.$each, conversation, callback);
      } else {
        callback(err, conversation);
      }
    });
  }

};