import { db } from '../constants/firebase';

export const subscribeToUserMatches = (
  currentUserId: string,
  callback: (matches: any[]) => void
) => {
  return db
    .collection('matches')
    .orderBy('lastMessageAt', 'desc')
    .onSnapshot(async (snapshot) => {
      const results: any[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data() as any;

        if (!data?.users?.includes(currentUserId)) continue;

        const otherUserId = data.users.find(
          (uid: string) => uid !== currentUserId
        );

        if (!otherUserId) continue;

        const userDoc = await db.collection('users').doc(otherUserId).get();
        const userData = userDoc.data() as any;

        const unreadCounts = data?.unreadCounts || {};
        const unreadCount = Number(unreadCounts[currentUserId] || 0);

        results.push({
          id: doc.id,
          otherUserId,
          name: userData?.name || 'Runner',
          photo: userData?.photoURL || '',
          city: userData?.city || 'Prague',
          pace: userData?.pace || '5:45',
          distance: userData?.distance || '10 KM',
          runType: userData?.runType || 'Road',
          sex: userData?.sex || 'Male',
          lastMessage: data?.lastMessage || 'Start chatting 👋',
          lastMessageAt: data?.lastMessageAt || null,
          unreadCount,
        });
      }

      callback(results);
    });
};