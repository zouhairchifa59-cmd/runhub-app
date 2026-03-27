import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { auth, db } from '../constants/firebase';

export default function IndexScreen() {
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user || !user.uid) {
        router.replace('/login');
        return;
      }

      try {
        const userDoc = await db.collection('users').doc(user.uid).get();

        if (userDoc.exists) {
          const data = userDoc.data() as any;

          if (data && data.profileComplete === true) {
            router.replace('/(tabs)');
          } else {
            router.replace('/onboarding');
          }
        } else {
          router.replace('/onboarding');
        }
      } catch {
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#ff3b3b" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
});