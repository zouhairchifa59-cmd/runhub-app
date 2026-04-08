import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ff3b3b',
    });
  }

  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

function parseRaceDateTime(date: string, time?: string) {
  if (!date) return null;

  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = (time || '09:00').split(':').map(Number);

  if (
    !year ||
    !month ||
    !day ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return null;
  }

  const raceDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return Number.isNaN(raceDate.getTime()) ? null : raceDate;
}

export async function scheduleRaceReminder(params: {
  raceId: string;
  raceName: string;
  raceDate: string;
  raceTime?: string;
  minutesBefore: number;
}) {
  const { raceId, raceName, raceDate, raceTime, minutesBefore } = params;
  const eventDate = parseRaceDateTime(raceDate, raceTime);
  if (!eventDate) return null;

  const triggerDate = new Date(eventDate.getTime() - minutesBefore * 60 * 1000);
  if (triggerDate.getTime() <= Date.now()) return null;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const request = await Notifications.requestPermissionsAsync();
    if (request.status !== 'granted') return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Run reminder 🏃',
      body: `${raceName} starts in ${minutesBefore >= 60 ? `${Math.floor(minutesBefore / 60)}h` : `${minutesBefore}m`}.`,
      data: {
        raceId,
        raceName,
        type: 'race-reminder',
      },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

export async function cancelScheduledReminders(
  notificationIds: string[] | undefined
) {
  if (!notificationIds?.length) return;

  await Promise.all(
    notificationIds.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id)
    )
  );
}
