import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  useEffect(() => {
    const routeFromNotification = (
      response: Notifications.NotificationResponse | null
    ) => {
      if (!response) return;

      const data = response.notification.request.content.data as {
        raceId?: string;
        type?: string;
      };

      if (data?.type === 'race-reminder' && data?.raceId) {
        router.push({
          pathname: '/race-details',
          params: {
            id: data.raceId,
          },
        });
      }
    };

    Notifications.getLastNotificationResponseAsync().then(routeFromNotification);

    const subscription = Notifications.addNotificationResponseReceivedListener(
      routeFromNotification
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style="light" />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0f0f0f' },
        }}
      />
    </>
  );
}
