import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { db } from '../constants/firebase';
import i18n from '../translations';
import { getProfileImage } from '../utils/avatar';
import {
    formatDistanceDisplay,
    formatPaceDisplay,
} from '../utils/profileFormat';

type PublicUserProfile = {
  name?: string;
  email?: string;
  city?: string;
  pace?: string;
  distance?: string;
  bio?: string;
  runType?: string;
  sex?: string;
  age?: number;
  photoURL?: string;
};

export default function UserProfileScreen() {
  const { uid } = useLocalSearchParams<{ uid?: string }>();

  const [profile, setProfile] = useState<PublicUserProfile>({});
  const [loading, setLoading] = useState(true);

  const userId = uid ? String(uid) : '';

  const translateRunType = (value?: string) => {
    if (value === 'Road') return i18n.t('road');
    if (value === 'Trail') return i18n.t('trail');
    return value || '-';
  };

  const translateSex = (value?: string) => {
    if (value === 'Male') return i18n.t('male');
    if (value === 'Female') return i18n.t('female');
    return value || '-';
  };

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        if (!userId) {
          setLoading(false);
          return;
        }

        setLoading(true);

        const doc = await db.collection('users').doc(userId).get();

        if (!doc.exists) {
          Alert.alert('Error', 'User not found');
          setLoading(false);
          return;
        }

        const data = (doc.data() as PublicUserProfile) || {};
        setProfile(data);
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [userId]);

  const profileImage = getProfileImage(profile.photoURL, profile.sex);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>{i18n.t('loadingProfile')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="#1c1b2b" />
        </Pressable>

        <View style={styles.titleWrap}>
          <Text style={styles.titleText}>{i18n.t('profile')}</Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.mainCard}>
        <Image
          source={{ uri: profileImage }}
          style={styles.avatar}
          onError={() => console.log('User avatar failed:', profileImage)}
        />

        <Text style={styles.name}>
          {profile.name || 'Runner'}
          {profile.age ? `, ${profile.age}` : ''}
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="location-sharp" size={16} color="#1c1b2b" />
            <Text style={styles.infoText}>{profile.city || 'Prague'}</Text>
          </View>

          <View style={styles.infoInlineRow}>
            <View style={styles.infoInlineItem}>
              <Ionicons name="swap-horizontal" size={16} color="#1c1b2b" />
              <Text style={styles.infoText}>
                {formatDistanceDisplay(profile.distance)}
              </Text>
            </View>

            <View style={styles.infoInlineItem}>
              <Ionicons name="speedometer-outline" size={16} color="#1c1b2b" />
              <Text style={styles.infoText}>
                {formatPaceDisplay(profile.pace)}
              </Text>
            </View>
          </View>

          <View style={styles.infoInlineRow}>
            <View style={styles.infoInlineItem}>
              <Ionicons name="walk-outline" size={16} color="#1c1b2b" />
              <Text style={styles.infoText}>
                {translateRunType(profile.runType)}
              </Text>
            </View>

            <View style={styles.infoInlineItem}>
              <Ionicons name="person-outline" size={16} color="#1c1b2b" />
              <Text style={styles.infoText}>{translateSex(profile.sex)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.bioCard}>
          <Text style={styles.bioTitle}>{i18n.t('bio')}</Text>
          <Text style={styles.bioText}>{profile.bio || '-'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b4cb3',
  },
  content: {
    paddingTop: 40,
    paddingHorizontal: 22,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b4cb3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#eef4ff',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#f7f7f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrap: {
    flex: 1,
    marginHorizontal: 12,
    backgroundColor: '#f7f7f7',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
  },
  titleText: {
    color: '#1c1b2b',
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 52,
    height: 52,
  },
  mainCard: {
    backgroundColor: '#f7f7f7',
    borderRadius: 34,
    padding: 22,
    alignItems: 'center',
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#d9e7ff',
    marginBottom: 14,
  },
  name: {
    color: '#1c1b2b',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 18,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#eef2ff',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  infoInlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  infoInlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 18,
    marginBottom: 8,
  },
  infoText: {
    color: '#1c1b2b',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },
  bioCard: {
    width: '100%',
    backgroundColor: '#eef2ff',
    borderRadius: 24,
    padding: 18,
  },
  bioTitle: {
    color: '#1c1b2b',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  bioText: {
    color: '#4b5563',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
});