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
import AppKeyboardWrapper from '../components/AppKeyboardWrapper';
import { auth, db } from '../constants/firebase';

export default function SignupScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const signup = async () => {
    try {
      if (!email.trim() || !password.trim()) {
        Alert.alert('Error', 'Please enter email and password');
        return;
      }

      setLoading(true);

      const result = await auth.createUserWithEmailAndPassword(
        email.trim(),
        password
      );

      if (!result.user || !result.user.uid) {
        throw new Error('User creation failed');
      }

      await db.collection('users').doc(result.user.uid).set(
        {
          email: result.user.email || '',
          profileComplete: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true }
      );

      router.replace('/onboarding');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppKeyboardWrapper contentContainerStyle={styles.page}>
      <View style={styles.card}>
        <Text style={styles.logo}>RUNHUB</Text>

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>
          Join RunHub and start discovering runners and races.
        </Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <Pressable style={styles.button} onPress={signup} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push('/login')}>
          <Text style={styles.link}>Already have an account? Login</Text>
        </Pressable>
      </View>
    </AppKeyboardWrapper>
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
    borderRadius: 25,
    padding: 20,
  },
  logo: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    color: '#1c1b2b',
  },
  subtitle: {
    fontSize: 15,
    color: '#555',
    marginBottom: 20,
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#d9e7ff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    color: '#000',
  },
  button: {
    backgroundColor: '#ff3b3b',
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 16,
  },
  link: {
    marginTop: 15,
    textAlign: 'center',
    color: '#0b4cb3',
    fontWeight: '700',
  },
});