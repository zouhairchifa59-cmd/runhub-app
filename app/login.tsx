import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import firebase from 'firebase/compat/app';
import AppKeyboardWrapper from '../components/AppKeyboardWrapper';
import { auth } from '../constants/firebase';

GoogleSignin.configure({
  webClientId:
    '498771923445-lf7u9m4m4kkqk87bjmq9424gh78hh66b.apps.googleusercontent.com',
});

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const login = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter email & password');
      return;
    }

    try {
      setLoading(true);
      await auth.signInWithEmailAndPassword(email.trim(), password);
      router.replace('/(tabs)/explore');
    } catch (e: any) {
      Alert.alert('Login Error', e?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

const idToken = userInfo.data?.idToken;
      if (!idToken) {
        Alert.alert('Error', 'No Google ID token found');
        return;
      }

      const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
      await auth.signInWithCredential(credential);

      router.replace('/(tabs)/explore');
    } catch (error: any) {
      Alert.alert('Google Login Error', error?.message || 'Something went wrong');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0E4FD0', '#1B67E8', '#78A3FF']}
      style={{ flex: 1 }}
    >
      <AppKeyboardWrapper contentContainerStyle={styles.page}>
        <View style={styles.card}>
          <Text style={styles.logo}>RUNHUB</Text>
          <Text style={styles.title}>Welcome back 👋</Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#7F89A8" />
            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#7F89A8" />
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />
          </View>

          <Pressable
            style={styles.button}
            onPress={login}
            disabled={loading || googleLoading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </Pressable>

          <Text style={styles.or}>or</Text>

          <Pressable
            style={styles.googleBtn}
            onPress={handleGoogleLogin}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#4285F4" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#4285F4" />
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          <Pressable onPress={() => router.push('/signup')}>
            <Text style={styles.link}>Create account</Text>
          </Pressable>
        </View>
      </AppKeyboardWrapper>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 22,
    elevation: 5,
  },
  logo: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0E4FD0',
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF3FF',
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    padding: 14,
    marginLeft: 6,
  },
  button: {
    backgroundColor: '#16A34A',
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: '900',
  },
  or: {
    textAlign: 'center',
    marginVertical: 14,
    color: '#7F89A8',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    padding: 14,
    borderRadius: 16,
  },
  googleText: {
    marginLeft: 8,
    fontWeight: '800',
  },
  link: {
    marginTop: 16,
    textAlign: 'center',
    color: '#0E4FD0',
    fontWeight: '800',
  },
});