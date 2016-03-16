'use strict';

angular.module('linagora.esn.chat')

  .controller('rootController', function($scope, $state, ChatConversationService) {
    ChatConversationService.getChannels().then(function(result) {
      $scope.conversations = result.data;
    });
  })
  .controller('chatController', function($scope, session, ChatService, ChatConversationService, ChatMessageAdapter, CHAT, chatScrollDown) {

    $scope.user = session.user;

    ChatConversationService.getChannels().then(function(result) {
      $scope.channel = result.data[0];
    });

    ChatConversationService.fetchMessages({
      size: CHAT.DEFAULT_FETCH_SIZE
    }).then(function(result) {
      $scope.messages = result;
    });

    $scope.newMessage = function(message) {
      ChatMessageAdapter.fromAPI(message).then(function(message) {
        $scope.messages.push(message);
        chatScrollDown();
      });
    };

    $scope.$on('chat:message:text', function(evt, message) {
      $scope.newMessage(message);
    });
  })

  .controller('addChannelController', function($scope, $state, ChatConversationService) {
    $scope.addChannel = function() {
      var channel = {
        name: $scope.channel.name,
        topic: $scope.channel.topic || '',
        purpose: $scope.channel.purpose || ''
      };

      ChatConversationService.postChannels(channel).then(function(response) {
        $state.go('chat');
        $scope.conversations.push(response.data);
      });
    };
  });
