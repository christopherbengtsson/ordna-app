import { getToken } from 'firebase/messaging';
import { initializeFirebase } from '../config/firebaseConfig';
import { supabaseClient } from '../../supabase/client/supabaseClient';

const registerFCMToken = async (): Promise<string | null> => {
  try {
    // Initialize Firebase messaging
    const messaging = await initializeFirebase();
    if (!messaging) {
      console.warn('Firebase Messaging not available');
      return null;
    }

    // Ensure we have notification permission
    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready;

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn('No FCM token received');
      return null;
    }

    // Update user's FCM token in database
    const { error } = await supabaseClient.rpc('update_fcm_token', { token });

    if (error) {
      console.error('Error updating FCM token in database:', error);
      throw error;
    }

    console.log('FCM token registered successfully');
    return token;
  } catch (error) {
    console.error('Error registering FCM token:', error);
    throw error;
  }
};

const unregisterFCMToken = async (): Promise<void> => {
  try {
    const { error } = await supabaseClient.rpc('clear_fcm_token');

    if (error) {
      console.error('Error clearing FCM token:', error);
      throw error;
    }

    console.log('FCM token cleared successfully');
  } catch (error) {
    console.error('Error unregistering FCM token:', error);
    throw error;
  }
};

export const NotificationService = {
  registerFCMToken,
  unregisterFCMToken,
};
