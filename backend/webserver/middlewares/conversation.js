'use strict';

const CONSTANTS = require('../../lib/constants');
const CONVERSATION_MODE = CONSTANTS.CONVERSATION_MODE;
const CONVERSATION_OBJECT_TYPES = CONSTANTS.OBJECT_TYPES.CONVERSATION;
const Q = require('q');

module.exports = function(dependencies, lib) {

  const logger = dependencies('logger');
  const user = dependencies('user');

  return {
    assertDefaultChannels,
    assertUserIsMemberOfDefaultChannels,
    canCreate,
    canRemove,
    canRead,
    canUpdate,
    canWrite,
    load,
    loadMember
  };

  function assertDefaultChannels(req, res, next) {
    const promises = req.user.domains.map(domain => Q.denodeify(lib.conversation.createDefaultChannel)({domainId: domain.domain_id}));

    Q.all(promises).then(() => next())
      .catch(err => {
        logger.error('Error while creating default channel', err);
        res.status(500).json({
          error: {
            code: 500,
            message: 'Server Error',
            details: 'Error while creating default channel'
          }
        });
    });
  }

  function assertUserIsMemberOfDefaultChannels(req, res, next) {
    const promises = req.user.domains.map(domain => Q.denodeify(lib.conversation.getDefaultChannel)({domainId: domain.domain_id}));

    Q.all(promises)
      .then(joinConversations)
      .then(() => {
        next();
      })
      .catch(err => {
        logger.error('Error while joining default channel', err);
        res.status(500).json({
          error: {
            code: 500,
            message: 'Server Error',
            details: 'Error while joining default channel'
          }
        });
    });

    function joinConversations(conversations) {
      return Q.all(conversations.map(join));
    }

    function join(conversation) {
      return lib.members.isMember(conversation, req.user).then(isMember => {
        if (isMember) {
          return isMember;
        }

        return lib.members.join(conversation, req.user);
      });
    }
  }

  function canCreate(req, res, next) {
    if (req.body.mode !== CONVERSATION_MODE.CHANNEL) {
      return res.status(403).json({
        error: {
          code: 403,
          message: 'Forbidden',
          details: 'Can not create a conversation which is not a channel'
        }
      });
    }

    next();
  }

  function canRemove(req, res, next) {
    lib.conversation.permission.userCanRemove(req.user, req.conversation).then(removable => {
      if (removable) {
        return next();
      }

      return res.status(403).json({
        error: {
          code: 403,
          message: 'Forbidden',
          details: `Can not remove conversation ${req.conversation.id}`
        }
      });

    }, err => {
      const msg = `Error while checkcing remove rights on conversation ${req.conversation.id}`;

      logger.error(msg, err);

      return res.status(500).json({
        error: {
          code: 500,
          message: 'Server Error',
          details: msg
        }
      });
    });
  }

  function canRead(req, res, next) {
    lib.conversation.permission.userCanRead(req.user, req.conversation).then(readable => {
      if (readable) {
        return next();
      }

      return res.status(403).json({
        error: {
          code: 403,
          message: 'Forbidden',
          details: `Can not read conversation ${req.conversation.id}`
        }
      });

    }, err => {
      const msg = `Error while checkcing read rights on conversation ${req.conversation.id}`;

      logger.error(msg, err);

      return res.status(500).json({
        error: {
          code: 500,
          message: 'Server Error',
          details: msg
        }
      });
    });
  }

  function canUpdate(req, res, next) {
    lib.conversation.permission.userCanUpdate(req.user, req.conversation).then(updatable => {
      if (updatable) {
        return next();
      }

      return res.status(403).json({
        error: {
          code: 403,
          message: 'Forbidden',
          details: `Can not update conversation ${req.conversation.id}`
        }
      });

    }, err => {
      const msg = `Error while checkcing update rights on conversation ${req.conversation.id}`;

      logger.error(msg, err);

      return res.status(500).json({
        error: {
          code: 500,
          message: 'Server Error',
          details: msg
        }
      });
    });
  }

  function canWrite() {

  }

  function load(req, res, next) {
    lib.conversation.getById(req.params.id, (err, conversation) => {
      if (err) {
        logger.error('Error while loading conversation', err);

        return res.status(500).json({
          error: {
            code: 500,
            message: 'Server Error',
            details: `Error while getting conversation ${req.params.id}`
          }
        });
      }

      if (!conversation) {
        return res.status(404).json({
          error: {
            code: 404,
            message: 'Not found',
            details: `No such conversation ${req.params.id}`
          }
        });
      }

      req.params.objectType = CONVERSATION_OBJECT_TYPES;
      req.conversation = conversation;
      next();
    });
  }

  function loadMember(req, res, next) {
    function onFind(req, res, next, err, user) {
      if (err) {
        return res.status(500).json({error: {code: 500, message: 'Server error', details: err.message}});
      }

      if (!user) {
        return res.status(404).json({error: {code: 404, message: 'Not found', details: 'User not found'}});
      }

      req.member = user;
      next();
    }

    if (!req.params.member_id) {
      return res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'uuid or email missing'}});
    }

    return user.get(req.params.member_id, onFind.bind(null, req, res, next));
  }
};
