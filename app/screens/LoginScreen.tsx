import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('❌ Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        Alert.alert('❌ Error de acceso', error.message);
      } else {
        console.log('✅ Login exitoso');
      }
    } catch (error: any) {
      Alert.alert('❌ Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('❌ Error', 'Por favor ingresa tu correo electrónico');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: 'imperio-gym://reset-password',
      });

      if (error) {
        Alert.alert('❌ Error', error.message);
      } else {
        Alert.alert(
          '📧 Correo enviado',
          'Se ha enviado un enlace para restablecer tu contraseña a tu correo electrónico.',
          [{ text: 'OK', onPress: () => setIsForgotPassword(false) }]
        );
      }
    } catch (error: any) {
      Alert.alert('❌ Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderLogo = () => {
    try {
      // Intenta cargar la imagen del logo
      const logoImage = require('../../assets/logo.png');
      return (
        <Image
          source={logoImage}
          style={styles.logo}
          resizeMode="contain"
        />
      );
    } catch (error) {
      // Si no hay logo, muestra texto IMPERIO GYM con diseño premium
      return (
        <View style={styles.textLogoContainer}>
          <Text style={styles.textLogoMain}>IMPERIO</Text>
          <Text style={styles.textLogoSub}>GYM</Text>
        </View>
      );
    }
  };

  return (
    <LinearGradient
      colors={['#000000', '#0a0a0a', '#1a1a1a']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo y Header Premium */}
          <View style={styles.headerContainer}>
            <LinearGradient
              colors={['#FFD700', '#FFA500', '#FF8C00']}
              style={styles.logoContainer}
            >
              <View style={styles.logoInner}>
                {renderLogo()}
              </View>
            </LinearGradient>
            
            <Text style={styles.tagline}>Sistema Profesional de Gestión</Text>
          </View>

          {/* Formulario */}
          <View style={styles.formContainer}>
            <LinearGradient
              colors={['#1a1a1a', '#111111', '#0a0a0a']}
              style={styles.formCard}
            >
              <Text style={styles.formTitle}>
                {isForgotPassword ? 'RECUPERAR CONTRASEÑA' : 'INICIAR SESIÓN'}
              </Text>
              
              {isForgotPassword ? (
                <>
                  <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={20} color="#FFD700" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Correo electrónico registrado"
                      placeholderTextColor="#666"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>

                  <View style={styles.forgotPasswordButtons}>
                    <TouchableOpacity 
                      style={styles.secondaryButton}
                      onPress={() => setIsForgotPassword(false)}
                    >
                      <Text style={styles.secondaryButtonText}>Volver al Login</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.buttonContainer}
                      onPress={handleForgotPassword}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={loading ? ['#333', '#333'] : ['#007AFF', '#0056CC']}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        {loading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="send-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                              ENVIAR ENLACE
                            </Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={20} color="#FFD700" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Correo electrónico"
                      placeholderTextColor="#666"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#FFD700" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Contraseña"
                      placeholderTextColor="#666"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons 
                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        color="#FFD700" 
                        style={styles.eyeIcon}
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity 
                    style={styles.forgotPasswordLink}
                    onPress={() => setIsForgotPassword(true)}
                  >
                    <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.buttonContainer}
                    onPress={handleAuth}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={loading ? ['#333', '#333'] : ['#FFD700', '#FFA000', '#FF8C00']}
                      style={styles.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFD700" />
                      ) : (
                        <>
                          <Ionicons 
                            name="log-in-outline" 
                            size={24} 
                            color="#000" 
                            style={styles.buttonIcon}
                          />
                          <Text style={styles.buttonText}>
                            INICIAR SESIÓN
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

              {/* Información del sistema */}
              {!isForgotPassword && (
                <View style={styles.systemInfo}>
                  <Text style={styles.systemTitle}>💪 SISTEMA IMPERIO GYM</Text>
                  <View style={styles.featuresGrid}>
                    <View style={styles.featureItem}>
                      <Ionicons name="barbell-outline" size={18} color="#FFD700" />
                      <Text style={styles.featureText}>Gestión de Rutinas</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="stats-chart" size={18} color="#FFD700" />
                      <Text style={styles.featureText}>Seguimiento de Medidas</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="calendar" size={18} color="#FFD700" />
                      <Text style={styles.featureText}>Planificación</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="people" size={18} color="#FFD700" />
                      <Text style={styles.featureText}>Gestión de Clientes</Text>
                    </View>
                  </View>
                  <Text style={styles.accessNote}>
                    <Ionicons name="shield-checkmark" size={14} color="#FFD700" /> 
                    {' '}Acceso seguro y privado
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2025 IMPERIO GYM - Sistema de Gestión</Text>
            <Text style={styles.footerSubtext}>Para uso exclusivo del personal autorizado</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    padding: 3,
    marginBottom: 20,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 25,
  },
  logoInner: {
    width: '100%',
    height: '100%',
    borderRadius: 67,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  textLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textLogoMain: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 2,
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  textLogoSub: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 3,
    marginTop: -5,
  },
  tagline: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 1,
    lineHeight: 20,
  },
  formContainer: {
    width: '100%',
    marginBottom: 20,
  },
  formCard: {
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 25,
    letterSpacing: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  eyeIcon: {
    padding: 5,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    padding: 5,
  },
  forgotPasswordText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  forgotPasswordButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  secondaryButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#333',
    borderRadius: 12,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  secondaryButtonText: {
    color: '#CCC',
    fontSize: 14,
    fontWeight: '600',
  },
  systemInfo: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  systemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: 1,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
  },
  featureText: {
    color: '#CCCCCC',
    fontSize: 13,
    marginLeft: 10,
    fontWeight: '500',
  },
  accessNote: {
    color: '#FFD700',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 25,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  footerText: {
    color: '#666',
    fontSize: 11,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 5,
  },
  footerSubtext: {
    color: '#444',
    fontSize: 10,
    letterSpacing: 1,
  },
});