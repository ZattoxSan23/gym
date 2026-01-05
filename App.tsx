import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { supabase } from './lib/supabase';
import LoginScreen from './app/screens/LoginScreen';
import AdminDashboard from './app/screens/AdminDashboard';
import TrainerDashboard from './app/screens/TrainerDashboard';
import ClientDashboard from './app/screens/ClientDashboard';

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(false);

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      setSession(session);
      
      // Resetear estado
      setUserRole(null);
      setCheckingRole(true);
      
      if (session) {
        console.log('🔄 Obteniendo rol para usuario:', session.user.email);
        await checkUserRole(session.user.id);
      } else {
        setCheckingRole(false);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      console.log('🔍 Verificando sesión activa...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('✅ Sesión encontrada:', session.user.email);
        setCheckingRole(true);
        await checkUserRole(session.user.id);
      } else {
        console.log('⚠️ No hay sesión activa');
        setCheckingRole(false);
      }
      
      setSession(session);
    } catch (error) {
      console.error('❌ Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserRole = async (userId: string) => {
    try {
      console.log('🎭 Verificando rol del usuario...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error obteniendo rol:', error);
        // No asignar rol por defecto
        setUserRole(null);
      } else if (data) {
        console.log('✅ Rol obtenido:', data.role);
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('❌ Error en checkUserRole:', error);
      setUserRole(null);
    } finally {
      setCheckingRole(false);
    }
  };

  // Determinar qué pantalla mostrar
  const getCurrentScreen = () => {
    console.log('📱 Determinando pantalla:', {
      loading,
      checkingRole,
      session: !!session,
      userRole
    });

    // 1. Carga inicial
    if (loading) {
      return 'loading';
    }

    // 2. Sin sesión
    if (!session) {
      return 'login';
    }

    // 3. Con sesión pero verificando rol
    if (checkingRole) {
      return 'checking_role';
    }

    // 4. Con sesión y rol definido
    if (userRole) {
      return userRole;
    }

    // 5. Con sesión pero sin rol (fallback)
    return 'login';
  };

  const currentScreen = getCurrentScreen();

  console.log('🎯 Pantalla actual:', currentScreen);

  // Renderizado
  if (currentScreen === 'loading') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Inicializando...</Text>
      </View>
    );
  }

  if (currentScreen === 'checking_role') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Verificando permisos...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {currentScreen === 'login' ? (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : currentScreen === 'admin' ? (
          <Stack.Screen 
            name="AdminDashboard" 
            component={AdminDashboard}
            options={{ headerShown: false }}
          />
        ) : currentScreen === 'trainer' ? (
          <Stack.Screen 
            name="TrainerDashboard" 
            component={TrainerDashboard}
            options={{ headerShown: false }}
          />
        ) : (
          // Solo llega aquí si userRole === 'client'
          <Stack.Screen 
            name="ClientDashboard" 
            component={ClientDashboard}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#FFD700',
    fontWeight: 'bold',
  },
});