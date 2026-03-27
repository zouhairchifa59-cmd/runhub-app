import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db, storage } from '../../constants/firebase';
import { getProfileImage } from '../../utils/avatar';
import {
  formatDistanceDisplay,
  formatPaceDisplay,
} from '../../utils/profileFormat';

type UserProfile = {
  name?: string;
  email?: string;
  city?: string;
  pace?: string;
  distance?: string;
  runType?: string;
  sex?: string;
  age?: number;
  photoURL?: string;
  runWithDog?: string;
  runWithMusic?: string;
  talkDuringRun?: string;
  adaptPace?: string;
  preferredTime?: string;
  surface?: string;
  goal?: string;
  level?: string;
};

const HEADER_LOGO =
  'https://res.cloudinary.com/dkj2qsk4z/image/upload/v1774607271/logo-header_vvyhdi.png';

function InfoRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  if (!text || text === '-') return null;

  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color="#31508A" />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

function OptionChip({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  if (!label || label.includes('undefined')) return null;

  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={15} color="#31508A" />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const user = auth.currentUser;

  const [profile, setProfile] = useState<UserProfile>({});
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const loadProfile = async () => {
    try {
      if (!user?.uid) return;

      setLoading(true);

      const doc = await db.collection('users').doc(user.uid).get();
      const data = (doc.data() as UserProfile) || {};

      setProfile({
        ...data,
        email: user.email || '',
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [user?.uid])
  );

  const handlePickImage = async () => {
    try {
      if (!user?.uid) return;

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow gallery access');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      setUploadingPhoto(true);

      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();

      const ref = storage.ref().child(`profile_images/${user.uid}.jpg`);
      await ref.put(blob);

      const downloadURL = await ref.getDownloadURL();

      await db.collection('users').doc(user.uid).set(
        {
          photoURL: downloadURL,
        },
        { merge: true }
      );

      setProfile((prev) => ({
        ...prev,
        photoURL: downloadURL,
      }));

      Alert.alert('Success', 'Profile photo updated');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace('/login');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Logout failed');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'Are you sure? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    try {
      if (!user?.uid) return;

      await db.collection('users').doc(user.uid).delete();
      await user.delete();

      router.replace('/login');
    } catch (e: any) {
      Alert.alert(
        'Error',
        e?.message || 'You may need to log in again before deleting the account'
      );
    }
  };

  const profileImage = getProfileImage(profile.photoURL, profile.sex);

  if (loading) {
    return (
      <LinearGradient
        colors={['#0F4FD1', '#165FE3', '#0E4BC1']}
        style={styles.screen}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="#0F4FD1"
          translucent={false}
        />

        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.loadingContainer}>
            <Image
              source={{ uri: HEADER_LOGO }}
              style={styles.loadingLogo}
              resizeMode="contain"
            />
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0F4FD1', '#165FE3', '#0E4BC1']}
      style={styles.screen}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0F4FD1"
        translucent={false}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={{ uri: HEADER_LOGO }}
            style={styles.headerLogo}
            resizeMode="contain"
          />

          <Text style={styles.pageTitle}>Profile</Text>

          <View style={styles.card}>
            <Pressable onPress={handlePickImage} style={styles.avatarWrap}>
              <Image source={{ uri: profileImage }} style={styles.avatar} />

              <View style={styles.cameraIcon}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera-outline" size={16} color="#fff" />
                )}
              </View>
            </Pressable>

            <Text style={styles.changePhotoText}>
              {uploadingPhoto ? 'Uploading photo...' : 'Tap photo to change'}
            </Text>

            <Text style={styles.name}>{profile.name || 'Runner'}</Text>
            <Text style={styles.email}>{profile.email || ''}</Text>

            <View style={styles.mainInfoCard}>
              <InfoRow icon="location-outline" text={profile.city || 'Prague'} />
              <InfoRow
                icon="speedometer-outline"
                text={formatPaceDisplay(profile.pace)}
              />
              <InfoRow
                icon="swap-horizontal-outline"
                text={formatDistanceDisplay(profile.distance)}
              />
              <InfoRow icon="walk-outline" text={profile.runType || '-'} />
              <InfoRow icon="person-outline" text={profile.sex || '-'} />
              <InfoRow
                icon="calendar-outline"
                text={profile.age ? `${profile.age} years` : '-'}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Running Style</Text>
              <View style={styles.chipsWrap}>
                <OptionChip
                  icon="paw-outline"
                  label={`Dog: ${profile.runWithDog || '-'}`}
                />
                <OptionChip
                  icon="musical-notes-outline"
                  label={`Music: ${profile.runWithMusic || '-'}`}
                />
                <OptionChip
                  icon="chatbubble-ellipses-outline"
                  label={`Talk: ${profile.talkDuringRun || '-'}`}
                />
                <OptionChip
                  icon="flash-outline"
                  label={`Adapt pace: ${profile.adaptPace || '-'}`}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preferences</Text>
              <View style={styles.chipsWrap}>
                <OptionChip
                  icon="time-outline"
                  label={profile.preferredTime || '-'}
                />
                <OptionChip
                  icon="map-outline"
                  label={profile.surface || '-'}
                />
                <OptionChip
                  icon="flag-outline"
                  label={profile.goal || '-'}
                />
                <OptionChip
                  icon="trending-up-outline"
                  label={profile.level || '-'}
                />
              </View>
            </View>

            <Pressable
              style={styles.editButton}
              onPress={() => router.push('/edit-profile')}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </Pressable>

            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#FF4A4A" />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>

            <Pressable style={styles.deleteButton} onPress={handleDeleteAccount}>
              <Ionicons name="trash-outline" size={17} color="#FF4A4A" />
              <Text style={styles.deleteText}>Delete Account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

  container: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 140,
  },

  headerLogo: {
    width: 180,
    height: 44,
    alignSelf: 'center',
    marginBottom: 10,
  },

  pageTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 14,
  },

  card: {
    backgroundColor: '#F7F8FC',
    borderRadius: 32,
    padding: 20,
    shadowColor: '#032A7A',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },

  avatarWrap: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 10,
  },

  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#DCE7FF',
  },

  cameraIcon: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1B67E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  changePhotoText: {
    textAlign: 'center',
    color: '#6C7791',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },

  name: {
    color: '#16244A',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },

  email: {
    color: '#6C7791',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },

  mainInfoCard: {
    backgroundColor: '#EEF3FF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  infoText: {
    color: '#223157',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
    flex: 1,
  },

  section: {
    marginBottom: 14,
  },

  sectionTitle: {
    color: '#16244A',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },

  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8EDF9',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },

  chipText: {
    color: '#33456E',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
  },

  editButton: {
    backgroundColor: '#1B67E8',
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 10,
  },

  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 8,
  },

  logoutButton: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FF4A4A',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },

  logoutText: {
    color: '#FF4A4A',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 6,
  },

  deleteButton: {
    minHeight: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  deleteText: {
    color: '#FF4A4A',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 6,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingLogo: {
    width: 200,
    height: 52,
    marginBottom: 18,
  },

  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
});