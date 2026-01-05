import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

const { width } = Dimensions.get("window");

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true); // Cambiado a true para mostrar loading inicial
  const [creatingUser, setCreatingUser] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalClients: 0,
    activeClients: 0,
    totalTrainers: 0,
    inactiveClients: 0,
  });

  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "", // SOLO NOMBRE COMPLETO
    role: "client",
  });

  useEffect(() => {
    // Cargar datos inmediatamente al montar el componente
    loadAllData();
    
    // Configurar listener para cambios en la autenticación
    const authListener = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Recargar datos cuando el usuario inicie sesión o refresque token
        await loadAllData();
      }
    });

    return () => {
      authListener.data.subscription.unsubscribe();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const loadAllData = async () => {
    try {
      console.log("📊 Cargando datos del dashboard...");
      
      // Verificar que hay sesión activa
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("⚠️ No hay sesión activa");
        setLoading(false);
        return;
      }

      // Cargar datos en paralelo
      const [usersData, clientsData, trainersData] = await Promise.all([
        loadUsers(),
        loadClients(),
        loadTrainers()
      ]);

      // Actualizar estados
      setUsers(usersData || []);
      setClients(clientsData || []);
      setTrainers(trainersData || []);

      // Calcular estadísticas
      calculateStats(usersData || [], clientsData || []);
      
      console.log("✅ Datos cargados exitosamente");
    } catch (error) {
      console.error("❌ Error cargando datos:", error);
      Alert.alert("❌ Error", "No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading users:", error);
        return [];
      }
      return data || [];
    } catch (error: any) {
      console.error("Error loading users:", error);
      return [];
    }
  };

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select(
          `
          *,
          profiles:user_id (*),
          trainers:trainer_id (*),
          branches:branch_id (*)
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading clients:", error);
        return [];
      }
      return data || [];
    } catch (error: any) {
      console.error("Error loading clients:", error);
      return [];
    }
  };

  const loadTrainers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "trainer")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading trainers:", error);
        return [];
      }
      return data || [];
    } catch (error: any) {
      console.error("Error loading trainers:", error);
      return [];
    }
  };

  const calculateStats = (usersArray: any[], clientsArray: any[]) => {
    const totalUsers = usersArray.length;
    const totalClients = clientsArray.length;
    const activeClients = clientsArray.filter((c) => c.status === "active").length;
    const totalTrainers = usersArray.filter((u) => u.role === "trainer").length;
    const inactiveClients = clientsArray.filter((c) => c.status === "inactive").length;

    setStats({
      totalUsers,
      totalClients,
      activeClients,
      totalTrainers,
      inactiveClients,
    });
  };

const createUser = async () => {
  // Validar que todos los campos requeridos estén llenos
  if (!newUser.email || !newUser.password || !newUser.full_name) {
    Alert.alert("❌ Error", "Todos los campos son obligatorios");
    return;
  }

  if (!newUser.full_name.trim()) {
    Alert.alert("❌ Error", "Por favor ingresa el nombre completo");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newUser.email)) {
    Alert.alert("❌ Error", "Por favor ingresa un email válido");
    return;
  }

  if (newUser.password.length < 6) {
    Alert.alert("❌ Error", "La contraseña debe tener al menos 6 caracteres");
    return;
  }

  setCreatingUser(true);

  try {
    console.log("🏗️ Creando usuario via create-user:", newUser.email);

    // 1. Verificar si el usuario ya existe en profiles
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", newUser.email.toLowerCase().trim())
      .maybeSingle();

    if (existingProfile) {
      Alert.alert("❌ Error", "Este email ya está registrado en el sistema");
      return;
    }

    // 2. Usar Edge Function create-user (NO clever-task)
    console.log("📤 Invocando create-user...");
    const { data, error } = await supabase.functions.invoke('clever-task', {
      body: {
        action: 'create_user',
        email: newUser.email.toLowerCase().trim(),
        password: newUser.password,
        full_name: newUser.full_name.trim(),
        role: newUser.role,
        // Si es cliente, agregar valores por defecto
        ...(newUser.role === 'client' && {
          membership_type: 'premium',
          branch_id: '5295230b-4596-4a9e-b87c-cd68d3f2431c',
          trainer_id: null
        })
      }
    });

    // Manejar la respuesta
    if (error) {
      console.error("❌ Error en create-user:", error);
      
      // Verificar si el usuario se creó de todos modos
      const { data: verifyUser } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", newUser.email.toLowerCase().trim())
        .maybeSingle();
      
      if (verifyUser) {
        console.log("⚠️ Usuario creado pero con advertencia");
        Alert.alert(
          "⚠️ Usuario Creado con Advertencia",
          `${newUser.full_name} fue registrado como ${getRoleName(newUser.role)} pero hubo un error secundario.\n\nEmail: ${newUser.email}\nContraseña: ${newUser.password}\n\nEl usuario puede iniciar sesión.`,
          [{
            text: "👌 CONTINUAR",
            onPress: () => {
              setModalVisible(false);
              setNewUser({
                email: "",
                password: "",
                full_name: "",
                role: "client",
              });
              loadAllData();
            },
          }]
        );
        return;
      }
      
      Alert.alert("❌ Error de registro", error.message || "Error desconocido");
      return;
    }

    // 3. Verificar respuesta exitosa
    if (!data) {
      console.error("❌ Sin datos en respuesta");
      Alert.alert("❌ Error", "No se recibió respuesta del servidor");
      return;
    }

    if (data.error) {
      console.error("❌ Error en datos de respuesta:", data.error);
      Alert.alert("❌ Error", data.error || "Error al crear usuario");
      return;
    }

    console.log("✅ Usuario creado exitosamente:", data);

    // 4. Éxito - Mostrar confirmación
    Alert.alert(
      "✅ USUARIO CREADO EXITOSAMENTE",
      `${data.full_name || newUser.full_name} ha sido registrado como ${getRoleName(
        newUser.role
      )}\n\n📧 Email: ${newUser.email}\n🔐 Contraseña: ${newUser.password}\n\n✅ El usuario puede iniciar sesión inmediatamente.`,
      [
        {
          text: "👌 CONTINUAR",
          onPress: () => {
            setModalVisible(false);
            setNewUser({
              email: "",
              password: "",
              full_name: "",
              role: "client",
            });
            loadAllData();
          },
        },
      ]
    );
  } catch (error: any) {
    console.error("❌ Error general:", error);
    Alert.alert("❌ Error Crítico", error.message || "Error inesperado al crear usuario");
  } finally {
    setCreatingUser(false);
  }
};

  const getRoleName = (role: string) => {
    switch (role) {
      case "admin":
        return "👑 Administrador";
      case "trainer":
        return "🏃 Entrenador";
      case "client":
        return "💪 Socio";
      default:
        return "Usuario";
    }
  };

const deleteUser = async (
  userId: string,
  userEmail: string,
  userRole: string
) => {
  // Prevenir eliminación de sí mismo
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId) {
    Alert.alert("⚠️ No permitido", "No puedes eliminarte a ti mismo");
    return;
  }

  // Prevenir eliminación de otros admins (opcional)
  if (userRole === "admin") {
    Alert.alert(
      "⚠️ Admin protegido",
      "Los administradores no pueden ser eliminados"
    );
    return;
  }

  Alert.alert(
    "🗑️ Eliminar Usuario",
    `¿Estás seguro de eliminar PERMANENTEMENTE a ${userEmail}?\n\n⚠️ Esta acción eliminará:\n• Todos los datos del usuario\n• Mediciones corporales\n• Rutinas asignadas\n• Solicitudes de entrenador\n• Registro de cliente\n• Cuenta de autenticación\n\n⚠️ Esta acción NO se puede deshacer.`,
    [
      { text: "❌ CANCELAR", style: "cancel" },
      {
        text: "🗑️ ELIMINAR TODO",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            console.log("🗑️ Iniciando eliminación COMPLETA del usuario:", userId);

            // 1. Usar la función delete-user MEJORADA
            console.log("📤 Invocando delete-user...");
            const { data, error } = await supabase.functions.invoke('dynamic-task', {
              body: {
                user_id: userId,
                user_role: userRole
              }
            });

            console.log("📋 Respuesta de delete-user:", data);

            // Manejo de errores mejorado
            if (error) {
              console.error("❌ Error invocando delete-user:", error);
              
              // Verificar si es un error 404 (función no encontrada)
              if (error.message?.includes("404") || error.message?.includes("Function not found")) {
                Alert.alert(
                  "❌ Función no disponible",
                  "La función de eliminación no está configurada. Contacta al administrador."
                );
                return;
              }
              
              // Si hay error pero la función devolvió datos
              if (data && data.error) {
                throw new Error(`Error del servidor: ${data.error}`);
              }
              
              throw new Error(`Error de conexión: ${error.message}`);
            }

            // Verificar respuesta
            if (!data) {
              throw new Error("No se recibió respuesta del servidor");
            }

            if (data.error || !data.success) {
              throw new Error(data.error || "Error al eliminar usuario");
            }

            // ÉXITO
            Alert.alert(
              "✅ USUARIO ELIMINADO",
              `${userEmail} ha sido eliminado completamente del sistema.\n\nTodos los datos asociados han sido borrados.`,
              [
                {
                  text: "👌 CONTINUAR",
                  onPress: () => {
                    // Recargar todos los datos
                    loadAllData();
                  }
                }
              ]
            );
            
          } catch (error: any) {
            console.error("❌ Error en eliminación:", error);
            
            // Mensajes de error más específicos
            let errorMessage = error.message || "No se pudo eliminar el usuario";
            
            if (errorMessage.includes("23503")) {
              errorMessage = "No se puede eliminar porque hay datos relacionados. Contacta al administrador.";
            } else if (errorMessage.includes("permission") || errorMessage.includes("auth")) {
              errorMessage = "No tienes permisos para realizar esta acción.";
            } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
              errorMessage = "Error de conexión. Verifica tu internet.";
            }
            
            Alert.alert(
              "❌ ERROR AL ELIMINAR",
              errorMessage
            );
          } finally {
            setLoading(false);
          }
        },
      },
    ]
  );
};

  const handleLogout = async () => {
    Alert.alert(
      "🚪 Cerrar Sesión",
      "¿Estás seguro de que quieres cerrar sesión?",
      [
        { text: "❌ Cancelar", style: "cancel" },
        {
          text: "✅ Cerrar Sesión",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert("❌ Error", error.message);
            }
          },
        },
      ]
    );
  };

  const renderStatsCards = () => (
    <View style={styles.statsGrid}>
      <LinearGradient colors={["#FFD700", "#FFA000"]} style={styles.statCard}>
        <Text style={styles.statNumber}>{stats.totalUsers}</Text>
        <Text style={styles.statLabel}>TOTAL USUARIOS</Text>
        <Ionicons
          name="people"
          size={24}
          color="#000"
          style={styles.statIcon}
        />
      </LinearGradient>

      <LinearGradient colors={["#1a1a1a", "#2a2a2a"]} style={styles.statCard}>
        <Text style={[styles.statNumber, styles.lightText]}>
          {stats.totalClients}
        </Text>
        <Text style={[styles.statLabel, styles.lightText]}>SOCIOS</Text>
        <Ionicons
          name="person"
          size={24}
          color="#FFD700"
          style={styles.statIcon}
        />
      </LinearGradient>

      <LinearGradient colors={["#1a1a1a", "#2a2a2a"]} style={styles.statCard}>
        <Text style={[styles.statNumber, styles.lightText]}>
          {stats.activeClients}
        </Text>
        <Text style={[styles.statLabel, styles.lightText]}>ACTIVOS</Text>
        <Ionicons
          name="checkmark-circle"
          size={24}
          color="#4CAF50"
          style={styles.statIcon}
        />
      </LinearGradient>

      <LinearGradient colors={["#FFD700", "#FFA000"]} style={styles.statCard}>
        <Text style={styles.statNumber}>{stats.totalTrainers}</Text>
        <Text style={styles.statLabel}>ENTRENADORES</Text>
        <Ionicons
          name="fitness"
          size={24}
          color="#000"
          style={styles.statIcon}
        />
      </LinearGradient>
    </View>
  );

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {renderStatsCards()}

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>⚡ ACCIONES RÁPIDAS</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setModalVisible(true)}
          >
            <LinearGradient
              colors={["#FFD700", "#FFA000"]}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="person-add" size={30} color="#000" />
              <Text style={styles.actionText}>CREAR USUARIO</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={loadAllData}>
            <LinearGradient
              colors={["#1a1a1a", "#2a2a2a"]}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="refresh" size={30} color="#FFD700" />
              <Text style={[styles.actionText, styles.lightText]}>
                ACTUALIZAR
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.recentUsers}>
        <Text style={styles.sectionTitle}>👥 USUARIOS RECIENTES</Text>
        {users.slice(0, 5).map((user) => (
          <View key={user.id} style={styles.recentUserCard}>
            <LinearGradient
              colors={["#1a1a1a", "#2a2a2a"]}
              style={styles.recentUserGradient}
            >
              <View style={styles.recentUserInfo}>
                <Text style={styles.recentUserName}>
                  {user.full_name || "Sin nombre"}
                </Text>
                <Text style={styles.recentUserEmail}>{user.email}</Text>
              </View>
              <View
                style={[
                  styles.roleBadge,
                  user.role === "admin"
                    ? styles.adminBadge
                    : user.role === "trainer"
                    ? styles.trainerBadge
                    : styles.clientBadge,
                ]}
              >
                <Text style={styles.roleBadgeText}>
                  {user.role?.toUpperCase() || "USUARIO"}
                </Text>
              </View>
            </LinearGradient>
          </View>
        ))}
      </View>
    </View>
  );

  const renderUsers = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <LinearGradient
          colors={["#FFD700", "#FFA000"]}
          style={styles.addButtonGradient}
        >
          <Ionicons name="person-add" size={24} color="#000" />
          <Text style={styles.addButtonText}>CREAR NUEVO USUARIO</Text>
        </LinearGradient>
      </TouchableOpacity>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.scrollList}
      >
        {users.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <LinearGradient
              colors={["#1a1a1a", "#2a2a2a"]}
              style={styles.userGradient}
            >
              <View style={styles.userHeader}>
                <View style={styles.userAvatar}>
                  <Ionicons name="person-circle" size={40} color="#FFD700" />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {user.full_name || "Sin nombre"}
                  </Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <Text style={styles.userDate}>
                    Creado:{" "}
                    {new Date(user.created_at).toLocaleDateString("es-ES")}
                  </Text>
                </View>
              </View>

              <View style={styles.userFooter}>
                <View
                  style={[
                    styles.userRole,
                    user.role === "admin"
                      ? styles.adminRole
                      : user.role === "trainer"
                      ? styles.trainerRole
                      : styles.clientRole,
                  ]}
                >
                  <Text style={styles.userRoleText}>
                    {getRoleName(user.role)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteUser(user.id, user.email, user.role)}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={["#FF4444", "#CC0000"]}
                    style={styles.deleteButtonGradient}
                  >
                    <Ionicons name="trash" size={18} color="#FFF" />
                    <Text style={styles.deleteButtonText}>ELIMINAR</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderClients = () => (
    <View style={styles.tabContent}>
      <View style={styles.clientStats}>
        <LinearGradient
          colors={["#1a1a1a", "#2a2a2a"]}
          style={styles.statsHeader}
        >
          <View style={styles.statItem}>
            <Text style={styles.statItemLabel}>ACTIVOS</Text>
            <Text style={[styles.statItemValue, styles.activeStat]}>
              {stats.activeClients}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statItemLabel}>INACTIVOS</Text>
            <Text style={[styles.statItemValue, styles.inactiveStat]}>
              {stats.inactiveClients}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statItemLabel}>TOTAL</Text>
            <Text style={[styles.statItemValue, styles.lightText]}>
              {stats.totalClients}
            </Text>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.scrollList}
      >
        {clients.map((client) => (
          <View key={client.id} style={styles.clientCard}>
            <LinearGradient
              colors={["#1a1a1a", "#2a2a2a"]}
              style={styles.clientGradient}
            >
              <View style={styles.clientHeader}>
                <View style={styles.clientAvatar}>
                  <Ionicons name="person" size={35} color="#FFD700" />
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>
                    {client.profiles?.full_name || "Cliente"}
                  </Text>
                  <Text style={styles.clientEmail}>
                    {client.profiles?.email}
                  </Text>
                  {client.branches && (
                    <Text style={styles.clientBranch}>
                      <Ionicons name="business" size={12} color="#FFD700" />{" "}
                      {client.branches.name}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.clientStatus,
                    client.status === "active"
                      ? styles.activeStatus
                      : styles.inactiveStatus,
                  ]}
                >
                  <Text style={styles.clientStatusText}>
                    {client.status === "active" ? "ACTIVO" : "INACTIVO"}
                  </Text>
                </View>
              </View>

              <View style={styles.clientDetails}>
                <Text style={styles.clientDetail}>
                  <Ionicons name="card" size={14} color="#FFD700" />{" "}
                  {client.membership_type || "Premium"}
                </Text>
                <Text style={styles.clientDetail}>
                  <Ionicons name="calendar" size={14} color="#FFD700" />{" "}
                  {new Date(client.start_date).toLocaleDateString("es-ES")}
                </Text>
                <Text style={styles.clientDetail}>
                  <Ionicons name="fitness" size={14} color="#FFD700" />{" "}
                  {client.trainers?.full_name || "Sin entrenador"}
                </Text>
              </View>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderTrainers = () => (
    <View style={styles.tabContent}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.scrollList}
      >
        {trainers.map((trainer) => {
          const trainerClients = clients.filter(
            (c) => c.trainer_id === trainer.id
          ).length;

          return (
            <View key={trainer.id} style={styles.trainerCard}>
              <LinearGradient
                colors={["#1a1a1a", "#2a2a2a"]}
                style={styles.trainerGradient}
              >
                <View style={styles.trainerHeader}>
                  <View style={styles.trainerAvatar}>
                    <Ionicons name="fitness" size={40} color="#FFD700" />
                  </View>
                  <View style={styles.trainerInfo}>
                    <Text style={styles.trainerName}>{trainer.full_name}</Text>
                    <Text style={styles.trainerEmail}>{trainer.email}</Text>
                    <Text style={styles.trainerDate}>
                      Registrado:{" "}
                      {new Date(trainer.created_at).toLocaleDateString("es-ES")}
                    </Text>
                  </View>
                </View>

                <View style={styles.trainerStats}>
                  <View style={styles.trainerStatItem}>
                    <Ionicons name="people" size={20} color="#FFD700" />
                    <Text style={styles.trainerStatValue}>
                      {trainerClients}
                    </Text>
                    <Text style={styles.trainerStatLabel}>SOCIOS</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <View style={styles.fullScreenLoading}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>CARGANDO DASHBOARD...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTitle}>
            <Ionicons name="shield" size={32} color="#FFD700" />
            <Text style={styles.title}>IMPERIO GYM</Text>
          </View>
          <Text style={styles.subtitle}>PANEL DE ADMINISTRACIÓN</Text>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
        >
          {[
            { key: "overview", icon: "speedometer", label: "Resumen" },
            { key: "users", icon: "people", label: "Usuarios" },
            { key: "clients", icon: "person", label: "Socios" },
            { key: "trainers", icon: "fitness", label: "Entrenadores" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={18}
                color={activeTab === tab.key ? "#000" : "#FFD700"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Contenido principal */}
      <View style={styles.content}>
        {activeTab === "overview" && renderOverview()}
        {activeTab === "users" && renderUsers()}
        {activeTab === "clients" && renderClients()}
        {activeTab === "trainers" && renderTrainers()}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LinearGradient
          colors={["#FF4444", "#CC0000"]}
          style={styles.logoutButtonGradient}
        >
          <Ionicons name="log-out" size={20} color="#FFF" />
          <Text style={styles.logoutButtonText}>CERRAR SESIÓN</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Modal Crear Usuario */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => !creatingUser && setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={["#1a1a1a", "#000000"]}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>👑 CREAR NUEVO USUARIO</Text>
              <TouchableOpacity
                onPress={() => !creatingUser && setModalVisible(false)}
                disabled={creatingUser}
              >
                <Ionicons name="close" size={28} color="#FFD700" />
              </TouchableOpacity>
            </View>

            {/* Campo de NOMBRE COMPLETO */}
            <TextInput
              style={styles.input}
              placeholder="Nombre completo *"
              placeholderTextColor="#666"
              value={newUser.full_name}
              onChangeText={(text) =>
                setNewUser({
                  ...newUser,
                  full_name: text,
                })
              }
              editable={!creatingUser}
            />

            <TextInput
              style={styles.input}
              placeholder="Email *"
              placeholderTextColor="#666"
              value={newUser.email}
              onChangeText={(text) => setNewUser({ ...newUser, email: text })}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!creatingUser}
            />

            <TextInput
              style={styles.input}
              placeholder="Contraseña * (mínimo 6 caracteres)"
              placeholderTextColor="#666"
              value={newUser.password}
              onChangeText={(text) =>
                setNewUser({ ...newUser, password: text })
              }
              secureTextEntry
              editable={!creatingUser}
            />

            <View style={styles.roleContainer}>
              <Text style={styles.roleLabel}>TIPO DE USUARIO:</Text>
              <View style={styles.roleButtons}>
                {["admin", "trainer", "client"].map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleButton,
                      newUser.role === role && styles.roleButtonSelected,
                      creatingUser && styles.buttonDisabled,
                    ]}
                    onPress={() =>
                      !creatingUser && setNewUser({ ...newUser, role })
                    }
                    disabled={creatingUser}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        newUser.role === role && styles.roleButtonTextSelected,
                      ]}
                    >
                      {role === "admin" && "👑 Admin"}
                      {role === "trainer" && "🏃 Entrenador"}
                      {role === "client" && "💪 Socio"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  creatingUser && styles.buttonDisabled,
                ]}
                onPress={() => !creatingUser && setModalVisible(false)}
                disabled={creatingUser}
              >
                <Text style={styles.cancelButtonText}>❌ CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  creatingUser && styles.buttonDisabled,
                ]}
                onPress={createUser}
                disabled={creatingUser}
              >
                <LinearGradient
                  colors={
                    creatingUser ? ["#666", "#666"] : ["#FFD700", "#FFA000"]
                  }
                  style={styles.confirmButtonGradient}
                >
                  {creatingUser ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#000" />
                      <Text style={styles.confirmButtonText}>
                        CREAR USUARIO
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#000000" 
  },
  content: {
    flex: 1,
  },

  // Loading Full Screen
  fullScreenLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },

  // Header
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#FFD700",
  },
  headerContent: { alignItems: "center", paddingHorizontal: 20 },
  headerTitle: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFD700",
    marginLeft: 10,
    letterSpacing: 2,
  },
  subtitle: { fontSize: 14, color: "#AAAAAA", letterSpacing: 2 },

  // Tabs
  tabContainer: { backgroundColor: "#000", paddingVertical: 10 },
  tabScroll: { paddingHorizontal: 10 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginHorizontal: 5,
    minWidth: 120,
  },
  activeTab: { backgroundColor: "#FFD700" },
  tabText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFD700",
    marginLeft: 8,
  },
  activeTabText: { color: "#000", fontWeight: "900" },

  // Content
  tabContent: { flex: 1, padding: 15 },
  scrollList: { flex: 1 },

  // Stats
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    width: (width - 40) / 2,
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 10,
    position: "relative",
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "900",
    color: "#000",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#000",
    letterSpacing: 1,
  },
  statIcon: { position: "absolute", top: 10, right: 10 },

  // Quick Actions
  quickActions: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 15,
    letterSpacing: 1,
  },
  actionsGrid: { flexDirection: "row", justifyContent: "space-between" },
  actionButton: {
    width: (width - 50) / 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  actionButtonGradient: { padding: 20, alignItems: "center", borderRadius: 12 },
  actionText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000",
    marginTop: 8,
    letterSpacing: 1,
  },

  // Recent Users
  recentUsers: { marginTop: 20 },
  recentUserCard: { marginBottom: 10, borderRadius: 12, overflow: "hidden" },
  recentUserGradient: {
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recentUserInfo: { flex: 1 },
  recentUserName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 2,
  },
  recentUserEmail: { fontSize: 12, color: "#AAA" },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15 },
  adminBadge: { backgroundColor: "#FFD700" },
  trainerBadge: { backgroundColor: "#007AFF" },
  clientBadge: { backgroundColor: "#28a745" },
  roleBadgeText: { fontSize: 10, fontWeight: "bold", color: "#000" },

  // Add Button
  addButton: { borderRadius: 12, overflow: "hidden", marginBottom: 20 },
  addButtonGradient: {
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    marginLeft: 10,
  },

  // User Card
  userCard: { marginBottom: 12, borderRadius: 12, overflow: "hidden" },
  userGradient: { padding: 15, borderRadius: 12 },
  userHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  userAvatar: { marginRight: 15 },
  userInfo: { flex: 1 },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 2,
  },
  userEmail: { fontSize: 13, color: "#AAA", marginBottom: 5 },
  userDate: { fontSize: 11, color: "#666" },
  userFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userRole: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  adminRole: { backgroundColor: "#FFD700" },
  trainerRole: {
    backgroundColor: "rgba(0, 122, 255, 0.2)",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  clientRole: {
    backgroundColor: "rgba(40, 167, 69, 0.2)",
    borderWidth: 1,
    borderColor: "#28a745",
  },
  userRoleText: { fontSize: 12, fontWeight: "bold", color: "#FFF" },
  deleteButton: { borderRadius: 8, overflow: "hidden" },
  deleteButtonGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#FFF",
    marginLeft: 5,
  },

  // Client Stats
  clientStats: { marginBottom: 20 },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 15,
    borderRadius: 12,
  },
  statItem: { alignItems: "center" },
  statItemLabel: {
    fontSize: 10,
    color: "#AAA",
    marginBottom: 5,
    letterSpacing: 1,
  },
  statItemValue: { fontSize: 24, fontWeight: "900" },
  activeStat: { color: "#4CAF50" },
  inactiveStat: { color: "#FF4444" },
  statDivider: {
    width: 1,
    backgroundColor: "#333",
    height: "80%",
    marginHorizontal: 10,
  },

  // Client Card
  clientCard: { marginBottom: 12, borderRadius: 12, overflow: "hidden" },
  clientGradient: { padding: 15, borderRadius: 12 },
  clientHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  clientAvatar: { marginRight: 15 },
  clientInfo: { flex: 1 },
  clientName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 2,
  },
  clientEmail: { fontSize: 13, color: "#AAA", marginBottom: 5 },
  clientBranch: { fontSize: 11, color: "#FFD700" },
  clientStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeStatus: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  inactiveStatus: {
    backgroundColor: "rgba(255, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "#FF4444",
  },
  clientStatusText: { fontSize: 10, fontWeight: "bold", color: "#FFF" },
  clientDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  clientDetail: {
    fontSize: 11,
    color: "#AAA",
    marginBottom: 5,
    flexDirection: "row",
    alignItems: "center",
  },

  // Trainer Card
  trainerCard: { marginBottom: 12, borderRadius: 12, overflow: "hidden" },
  trainerGradient: { padding: 15, borderRadius: 12 },
  trainerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  trainerAvatar: { marginRight: 15 },
  trainerInfo: { flex: 1 },
  trainerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 2,
  },
  trainerEmail: { fontSize: 13, color: "#AAA", marginBottom: 5 },
  trainerDate: { fontSize: 11, color: "#666" },
  trainerStats: { flexDirection: "row", justifyContent: "center" },
  trainerStatItem: { alignItems: "center", marginHorizontal: 10 },
  trainerStatValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFD700",
    marginVertical: 5,
  },
  trainerStatLabel: { fontSize: 10, color: "#AAA" },

  // Logout Button
  logoutButton: { margin: 15, borderRadius: 12, overflow: "hidden" },
  logoutButtonGradient: {
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFF",
    marginLeft: 10,
  },

  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  modalContent: {
    borderRadius: 20,
    padding: 25,
    width: "90%",
    maxWidth: 400,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFD700",
    letterSpacing: 1,
  },
  input: {
    backgroundColor: "#222",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    color: "#FFF",
    borderWidth: 1,
    borderColor: "#333",
  },
  roleContainer: { marginBottom: 20 },
  roleLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 10,
  },
  roleButtons: { flexDirection: "row", justifyContent: "space-between" },
  roleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#222",
    marginHorizontal: 5,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  roleButtonSelected: { backgroundColor: "#FFD700", borderColor: "#FFA000" },
  roleButtonText: { fontSize: 12, fontWeight: "bold", color: "#AAA" },
  roleButtonTextSelected: { color: "#000" },
  modalButtons: { flexDirection: "row", justifyContent: "space-between" },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#333",
    marginRight: 10,
    alignItems: "center",
  },
  cancelButtonText: { color: "#FFF", fontSize: 14, fontWeight: "bold" },
  confirmButton: { flex: 1, borderRadius: 10, overflow: "hidden" },
  confirmButtonGradient: {
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },

  // Loading
  loadingText: {
    marginTop: 15,
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "bold",
  },

  // Utility
  lightText: { color: "#FFF" },
  buttonDisabled: { opacity: 0.6 },
});