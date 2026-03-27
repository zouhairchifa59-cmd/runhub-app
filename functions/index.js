const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

function isExpoPushToken(token) {
  return typeof token === 'string' && token.startsWith('ExponentPushToken[');
}

exports.sendChatPushNotification = functions.firestore
  .document('matches/{matchId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    try {
      const message = snap.data();
      const matchId = context.params.matchId;

      if (!message) return null;

      const receiverId = message.receiverId;
      const senderId = message.senderId;
      const senderName = message.senderName || 'Runner';
      const text = message.text || 'New message';

      if (!receiverId) return null;

      const receiverDoc = await admin
        .firestore()
        .collection('users')
        .doc(receiverId)
        .get();

      if (!receiverDoc.exists) {
        console.log('Receiver user not found');
        return null;
      }

      const receiverData = receiverDoc.data() || {};
      const expoPushToken = receiverData.expoPushToken;

      if (!expoPushToken || !isExpoPushToken(expoPushToken)) {
        console.log('Invalid or missing Expo push token');
        return null;
      }

      const matchDoc = await admin
        .firestore()
        .collection('matches')
        .doc(matchId)
        .get();

      const matchData = matchDoc.data() || {};
      const users = Array.isArray(matchData.users) ? matchData.users : [];
      const otherUserId = users.find((uid) => uid !== receiverId) || senderId;

      const payload = {
        to: expoPushToken,
        sound: 'default',
        title: senderName,
        body: text,
        data: {
          type: 'chat',
          matchId: matchId,
          uid: otherUserId,
          name: senderName
        }
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      console.log('Push sent:', result);

      return null;
    } catch (error) {
      console.log('Push error:', error);
      return null;
    }
  });