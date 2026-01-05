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
  StatusBar,
  Image,
  Platform,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import WebView from "react-native-webview";
import { BodyMetricsCalculator } from "../../lib/bodyMetrics";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width, height } = Dimensions.get("window");

interface ClientIndicator {
  hasMeasurements: boolean;
  hasRoutine: boolean;
}

export default function TrainerDashboard() {
  const [exerciseSearchModalVisible, setExerciseSearchModalVisible] =
    useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [clientIndicators, setClientIndicators] = useState<{
    [key: string]: ClientIndicator;
  }>({});
  const [editingRoutine, setEditingRoutine] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("clients");
  const [clients, setClients] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [evaluationRequests, setEvaluationRequests] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [measurementModalVisible, setMeasurementModalVisible] = useState(false);
  const [routineModalVisible, setRoutineModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [templateEditing, setTemplateEditing] = useState(false);
  const [clientHistory, setClientHistory] = useState<any[]>([]);
  // Estados para programación de evaluaciones
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [selectedEvaluationRequest, setSelectedEvaluationRequest] =
    useState<any>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [evaluationNotes, setEvaluationNotes] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());
  

  const [newClient, setNewClient] = useState({
    email: "",
    password: "",
    full_name: "",
    membership_type: "",
    branch_id: "",
  });

  const [newExercise, setNewExercise] = useState({
    name: "",
    description: "",
    video_url: "",
    muscle_group: "",
  });

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    difficulty: "beginner",
    duration_weeks: "8",
    is_public: false,
    exercises: [] as any[],
  });

  const [newRoutine, setNewRoutine] = useState({
    name: "",
    description: "",
    client_id: "",
    template_id: "",
    exercises: [] as any[],
  });

  const [bodyMeasurements, setBodyMeasurements] = useState({
    age: "",
    gender: "male" as "male" | "female",
    height: "",
    weight: "",
    neck: "",
    shoulders: "",
    chest: "",
    arms: "",
    waist: "",
    glutes: "",
    legs: "",
    calves: "",
    injuries: "",
  });

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setLoading(true);
        console.log("🚀 Iniciando dashboard del entrenador...");

        // Verificar autenticación primero
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.error("❌ Error de autenticación:", authError);
          Alert.alert(
            "Error",
            "Problema de autenticación. Por favor, reinicia la app."
          );
          return;
        }

        if (!user) {
          console.log("⚠️ No hay usuario autenticado");
          // Podrías redirigir al login aquí
          return;
        }

        console.log("✅ Usuario autenticado:", user.email);

        // Verificar rol específico
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!profile || profile.role !== "trainer") {
          console.warn("⚠️ Usuario no tiene rol de entrenador:", profile?.role);
          Alert.alert(
            "Acceso restringido",
            "Esta funcionalidad es solo para entrenadores."
          );
          return;
        }

        console.log("🎭 Rol confirmado: entrenador");

        // Cargar todos los datos
        await loadAllData();
      } catch (error) {
        console.error("❌ Error crítico inicializando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();

    // Cleanup
    return () => {
      console.log("🧹 Limpiando dashboard del entrenador");
    };
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que quieres cerrar sesión?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Cerrar Sesión",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase.auth.signOut();
              if (error) {
                Alert.alert("Error", "No se pudo cerrar sesión");
              }
            } catch (error) {
              console.error("Error al cerrar sesión:", error);
              Alert.alert("Error", "Ocurrió un error al cerrar sesión");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ✅ FUNCIONES PRINCIPALES CORREGIDAS - SIN safeSupabaseQuery
  const loadClientIndicators = async (clientId: string) => {
    try {
      console.log("📊 Cargando indicadores para cliente:", clientId);

      // Consultas directas sin safeSupabaseQuery
      const { data: measurementsData } = await supabase
        .from("body_measurements")
        .select("id")
        .eq("client_id", clientId)
        .limit(1);

      const { data: routinesData } = await supabase
        .from("routines")
        .select("id")
        .eq("client_id", clientId)
        .eq("status", "active")
        .limit(1);

      const hasMeasurements = !!(
        measurementsData && measurementsData.length > 0
      );
      const hasRoutine = !!(routinesData && routinesData.length > 0);

      console.log(`✅ Indicadores para ${clientId}:`, {
        hasMeasurements,
        hasRoutine,
      });

      setClientIndicators((prev) => ({
        ...prev,
        [clientId]: { hasMeasurements, hasRoutine },
      }));

      return { hasMeasurements, hasRoutine };
    } catch (error) {
      console.error("❌ Error loading client indicators:", error);
      return { hasMeasurements: false, hasRoutine: false };
    }
  };

  const loadClients = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.log("❌ No hay usuario autenticado");
      setClients([]);
      return;
    }

    try {
      console.log("🔍 Cargando clientes para trainer:", user.id);

      // Consulta simplificada sin joins complejos
      const { data: clientsData, error } = await supabase
        .from("clients")
        .select("*")
        .eq("trainer_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error cargando clientes:", error);
        setClients([]);
        return;
      }

      console.log("✅ Clientes base cargados:", clientsData?.length || 0);

      // Enriquecer datos de cada cliente
      const enrichedClients = await Promise.all(
        (clientsData || []).map(async (client) => {
          try {
            // Obtener datos del usuario - profiles es un array
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", client.user_id)
              .limit(1);

            // Obtener datos de la sucursal - branches es un array
            const { data: branchData } = await supabase
              .from("branches")
              .select("name")
              .eq("id", client.branch_id)
              .limit(1);

            // Tomar el primer elemento de cada array
            const profile = Array.isArray(profileData)
              ? profileData[0]
              : profileData;
            const branch = Array.isArray(branchData)
              ? branchData[0]
              : branchData;

            return {
              ...client,
              profiles: {
                full_name: profile?.full_name || "Cliente sin nombre",
                email: profile?.email || "Sin email",
              },
              branches: {
                name: branch?.name || "Sede no asignada",
              },
            };
          } catch (err) {
            console.warn("⚠️ Error enriqueciendo cliente:", client.id, err);
            return {
              ...client,
              profiles: { full_name: "Cliente", email: "Sin email" },
              branches: { name: "Sede no asignada" },
            };
          }
        })
      );

      setClients(enrichedClients);

      // Cargar indicadores para cada cliente
      if (enrichedClients.length > 0) {
        enrichedClients.forEach((client) => {
          loadClientIndicators(client.id);
        });
      }
    } catch (error) {
      console.error("❌ Error en loadClients:", error);
      setClients([]);
    }
  };

  // ✅ Agregar esta función para limpiar estados
  const resetAllStates = () => {
    console.log("🧹 Limpiando todos los estados");
    setClients([]);
    setExercises([]);
    setTemplates([]);
    setEvaluationRequests([]);
    setClientIndicators({});
    setBranches([]);
    setLoading(false);
    setRefreshing(false);
  };

  // ✅ Actualizar onRefresh
  const onRefresh = async () => {
    console.log("🔄 Forzando recarga manual");
    setRefreshing(true);
    resetAllStates();
    await loadAllData();
    setRefreshing(false);
  };

const loadEvaluationRequests = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.log("❌ No hay usuario autenticado");
    setEvaluationRequests([]);
    return;
  }

  try {
    console.log("📋 Cargando solicitudes para trainer:", user.id);

    // Usar la vista que no tiene políticas RLS
    const { data: requests, error: requestsError } = await supabase
      .from("evaluation_requests_with_clients")
      .select("*")
      .eq("current_trainer_id", user.id)
      .order("request_date", { ascending: true });

    if (requestsError) {
      console.error("❌ Error cargando solicitudes:", requestsError);
      setEvaluationRequests([]);
      return;
    }

    console.log("✅ Solicitudes cargadas:", requests?.length || 0);

    // Formatear los datos para la UI
    const formattedRequests = (requests || []).map(request => {
      // Extraer solo la fecha si scheduled_date contiene fecha y hora
      let scheduledDate = null;
      let scheduledTime = null;
      
      if (request.scheduled_date) {
        const dateObj = new Date(request.scheduled_date);
        scheduledDate = dateObj.toISOString().split('T')[0];
        scheduledTime = dateObj.toTimeString().slice(0, 5); // HH:MM
      }

      return {
        id: request.id,
        client_id: request.client_id,
        current_trainer_id: request.current_trainer_id,
        request_date: request.request_date,
        status: request.status,
        purpose: request.purpose,
        preferred_time: request.preferred_time,
        notes: request.notes,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        clients: {
          profiles: {
            full_name: request.client_full_name || "Cliente",
            email: request.client_email || "Sin email",
          },
          membership_type: request.membership_type,
          status: request.client_status,
        }
      };
    });

    setEvaluationRequests(formattedRequests);
  } catch (error) {
    console.error("❌ Error en loadEvaluationRequests:", error);
    setEvaluationRequests([]);
  }
};

  // ✅ Actualizar loadAllData para evitar duplicaciones
  const loadAllData = async () => {
    try {
      console.log("🔄 Cargando todos los datos...");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("❌ No hay usuario autenticado");
        Alert.alert("Error", "No hay sesión activa. Por favor, inicia sesión.");
        return;
      }

      console.log("👤 Usuario actual:", user.email);

      // Verificar rol
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "trainer") {
        console.warn("⚠️ El usuario no es entrenador:", profile?.role);
        return;
      }

      // Cargar en paralelo solo datos independientes
      await Promise.all([loadExercises(), loadTemplates(), loadBranches()]);

      // Cargar secuencialmente datos dependientes
      await loadClients();
      await loadEvaluationRequests();

      console.log("✅ Todos los datos cargados correctamente");
    } catch (error) {
      console.error("❌ Error loading data:", error);
      Alert.alert(
        "Error",
        "No se pudieron cargar los datos. Por favor, intenta de nuevo."
      );
    }
  };

  const loadExercises = async () => {
    try {
      console.log("💪 Cargando TODOS los ejercicios...");

      // Eliminar el filtro .eq("created_by", user.id) para ver todos
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error cargando ejercicios:", error);
        setExercises([]);
        return;
      }

      console.log(
        `✅ ${data?.length || 0} ejercicios cargados (todos los entrenadores)`
      );
      setExercises(data || []);
    } catch (error) {
      console.error("❌ Error en loadExercises:", error);
      setExercises([]);
    }
  };

  // ✅ MEJORAR loadBranches
  // ✅ MANTENER SOLO ESTA VERSIÓN (la que tiene mejor manejo de errores)
  const loadBranches = async () => {
    try {
      const { data, error } = await supabase.from("branches").select("*");

      if (error) {
        console.error("❌ Error cargando sucursales:", error);
        setBranches([]);
        return;
      }

      setBranches(data || []);
      if (data && data.length > 0) {
        setNewClient((prev) => ({ ...prev, branch_id: data[0].id }));
      }
    } catch (error) {
      console.error("❌ Error en loadBranches:", error);
      setBranches([]);
    }
  };

  // ✅ CORREGIDO: loadTemplates simplificado
  const loadTemplates = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      console.log("📋 Cargando plantillas para trainer:", user.id);

      // Primero obtener las plantillas
      const { data: templatesData, error } = await supabase
        .from("routine_templates")
        .select("*")
        .eq("trainer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error cargando plantillas:", error);
        setTemplates([]);
        return;
      }

      console.log("✅ Plantillas base cargadas:", templatesData?.length || 0);

      // Luego obtener los ejercicios de cada plantilla
      const enrichedTemplates = await Promise.all(
        (templatesData || []).map(async (template) => {
          try {
            const { data: exercisesData } = await supabase
              .from("template_exercises")
              .select(
                `
              *,
              exercises (*)
            `
              )
              .eq("template_id", template.id)
              .order("order_index", { ascending: true });

            return {
              ...template,
              template_exercises: exercisesData || [],
            };
          } catch (err) {
            console.warn(
              "⚠️ Error cargando ejercicios de plantilla:",
              template.id,
              err
            );
            return {
              ...template,
              template_exercises: [],
            };
          }
        })
      );

      setTemplates(enrichedTemplates);
    } catch (error) {
      console.error("❌ Error en loadTemplates:", error);
      setTemplates([]);
    }
  };

  const loadClientRoutine = async (clientId: string) => {
    try {
      console.log("🔄 Cargando rutina del cliente:", clientId);

      // Resetear estado primero
      setNewRoutine({
        name: "",
        description: "",
        client_id: clientId,
        template_id: "",
        exercises: [],
      });

      const { data, error } = await supabase
        .from("routines")
        .select(
          `
        *,
        routine_exercises (
          *,
          exercises (*)
        )
      `
        )
        .eq("client_id", clientId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.warn("⚠️ Error cargando rutina:", error);
        setEditingRoutine(null);
        setRoutineModalVisible(true);
        return;
      }

      if (data && data.length > 0) {
        console.log("✅ Rutina cargada:", data[0].id);
        setEditingRoutine(data[0]);

        const formattedExercises =
          data[0].routine_exercises?.map((re: any) => ({
            id: re.id || Date.now().toString(),
            exercise_id: re.exercise_id,
            sets: re.sets?.toString() || "3",
            reps: re.reps || "10-12",
            minutes: re.minutes || "",
            rest_time: re.rest_time || "60",
            day_of_week: re.day_of_week || "monday",
            exercise_name: re.exercises?.name || "Ejercicio no disponible",
          })) || [];

        setNewRoutine({
          name: data[0].name,
          description: data[0].description || "",
          client_id: clientId,
          template_id: data[0].template_id || "",
          exercises: formattedExercises,
        });
      } else {
        console.log("ℹ️ No hay rutina activa para este cliente");
        setEditingRoutine(null);
      }

      setRoutineModalVisible(true);
    } catch (error) {
      console.error("❌ Error en loadClientRoutine:", error);
      setEditingRoutine(null);
      setRoutineModalVisible(true);
    }
  };

  // ✅ NUEVO (CORREGIDO)
  const loadClientHistory = async (clientId: string) => {
    try {
      console.log("📊 Cargando historial para cliente:", clientId);

      const { data, error } = await supabase
        .from("body_measurements")
        .select("*")
        .eq("client_id", clientId)
        .order("measurement_date", { ascending: false });

      if (error) {
        console.error("❌ Error cargando historial:", error);
        setClientHistory([]);
        return;
      }

      console.log("✅ Historial cargado:", data?.length || 0, "registros");
      setClientHistory(data || []);
    } catch (error) {
      console.error("❌ Error loading client history:", error);
      setClientHistory([]);
    }
  };
const scheduleEvaluation = async () => {
  if (!selectedEvaluationRequest || !selectedDate || !selectedTime) {
    Alert.alert("Error", "Selecciona fecha y hora para la evaluación");
    return;
  }

  try {
    setLoading(true);

    // ✅ Combinar fecha y hora
    const scheduledDateTime = `${selectedDate}T${selectedTime}:00`;

    const updateData = {
      status: "accepted",  // ❗ CAMBIADO de "scheduled" a "accepted"
      scheduled_date: scheduledDateTime,
      notes: evaluationNotes,
    };

    console.log("📅 Programando evaluación:", updateData);

    const { error } = await supabase
      .from("evaluation_requests")
      .update(updateData)
      .eq("id", selectedEvaluationRequest.id);

    if (error) {
      console.error("❌ Error Supabase:", error);
      throw error;
    }

    Alert.alert(
      "✅ Evaluación Programada",
      `Evaluación programada para:\n\n📅 ${selectedDate}\n⏰ ${selectedTime}\n\nCliente: ${
        selectedEvaluationRequest.clients?.profiles?.full_name || "Cliente"
      }`
    );

    // Resetear y recargar
    setScheduleModalVisible(false);
    setSelectedDate("");
    setSelectedTime("");
    setEvaluationNotes("");
    setSelectedEvaluationRequest(null);

    await loadEvaluationRequests();
    await loadClients();
  } catch (error: any) {
    console.error("❌ Error programando evaluación:", error);
    Alert.alert(
      "❌ Error",
      error.message || "No se pudo programar la evaluación"
    );
  } finally {
    setLoading(false);
  }
};
  const loadTemplateExercises = async (templateId: string) => {
    try {
      console.log("🔄 Cargando ejercicios de plantilla:", templateId);

      const { data, error } = await supabase
        .from("template_exercises")
        .select(
          `
          *,
          exercises (*)
        `
        )
        .eq("template_id", templateId)
        .order("order_index", { ascending: true });

      if (error) {
        console.error("❌ Error cargando ejercicios de plantilla:", error);
        Alert.alert(
          "Error",
          "No se pudieron cargar los ejercicios de la plantilla"
        );
        return;
      }

      if (data && data.length > 0) {
        console.log(`✅ ${data.length} ejercicios cargados de la plantilla`);

        const formattedExercises = data.map((te: any, index: number) => ({
          id: Date.now().toString() + te.exercise_id + index,
          exercise_id: te.exercise_id,
          sets: te.sets?.toString() || "3",
          reps: te.reps || "10-12",
          minutes: te.minutes || "",
          rest_time: te.rest_time || "60",
          day_of_week: te.day_of_week || "monday",
          exercise_name: te.exercises?.name || "Ejercicio no disponible",
        }));

        setNewRoutine((prev) => ({
          ...prev,
          exercises: formattedExercises,
        }));

        Alert.alert(
          "✅ Éxito",
          `Se cargaron ${data.length} ejercicios de la plantilla`
        );
      } else {
        console.log("ℹ️ No hay ejercicios en esta plantilla");
        Alert.alert(
          "ℹ️ Información",
          "Esta plantilla no tiene ejercicios asignados"
        );
      }
    } catch (error) {
      console.error("❌ Error loading template exercises:", error);
      Alert.alert(
        "❌ Error",
        "No se pudieron cargar los ejercicios de la plantilla"
      );
    }
  };

  // ✅ FUNCIONES DE CREACIÓN/ELIMINACIÓN/ACTUALIZACIÓN
  const createClient = async () => {
    if (
      !newClient.email ||
      !newClient.password ||
      !newClient.full_name ||
      !newClient.membership_type
    ) {
      Alert.alert("Error", "Todos los campos son obligatorios");
      return;
    }

    setLoading(true);
    const {
      data: { user: trainer },
    } = await supabase.auth.getUser();
    if (!trainer) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa");

      console.log("🚀 Creando cliente con método seguro...");

      const response = await fetch(
        "https://zzmsxzrrpffrwqwqrncr.supabase.co/functions/v1/swift-task",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: newClient.email,
            password: newClient.password,
            full_name: newClient.full_name,
            membership_type: newClient.membership_type,
            branch_id: newClient.branch_id,
            trainer_id: trainer.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Error ${response.status}`);
      }

      Alert.alert("✅ Éxito", "Cliente creado exitosamente");
      setModalVisible(false);
      resetNewClient();
      loadClients();
    } catch (error: any) {
      console.error("❌ Error creando cliente:", error);
      Alert.alert("❌ Error", error.message || "Error al crear cliente");
    } finally {
      setLoading(false);
    }
  };

  const resetNewClient = () => {
    setNewClient({
      email: "",
      password: "",
      full_name: "",
      membership_type: "",
      branch_id: branches[0]?.id || "",
    });
  };

  const createExercise = async () => {
    if (!newExercise.name) {
      Alert.alert("Error", "El nombre del ejercicio es obligatorio");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      if (isEditing && selectedExercise) {
        const { error } = await supabase
          .from("exercises")
          .update(newExercise)
          .eq("id", selectedExercise.id);
        if (error) throw error;
        Alert.alert("✅ Éxito", "Ejercicio actualizado correctamente");
      } else {
        const { error } = await supabase.from("exercises").insert([
          {
            ...newExercise,
            created_by: user.id,
          },
        ]);
        if (error) throw error;
        Alert.alert("✅ Éxito", "Ejercicio creado correctamente");
      }

      setExerciseModalVisible(false);
      setNewExercise({
        name: "",
        description: "",
        video_url: "",
        muscle_group: "",
      });
      setSelectedExercise(null);
      setIsEditing(false);
      loadExercises();
    } catch (error: any) {
      Alert.alert("❌ Error", error.message);
    }
  };

  const deleteExercise = async (exerciseId: string) => {
    Alert.alert(
      "Confirmar Eliminación",
      "¿Estás seguro de que quieres eliminar este ejercicio?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("exercises")
              .delete()
              .eq("id", exerciseId);
            if (error) {
              Alert.alert("Error", error.message);
            } else {
              Alert.alert("✅ Éxito", "Ejercicio eliminado");
              loadExercises();
            }
          },
        },
      ]
    );
  };

  const editExercise = (exercise: any) => {
    setSelectedExercise(exercise);
    setNewExercise({
      name: exercise.name,
      description: exercise.description || "",
      video_url: exercise.video_url || "",
      muscle_group: exercise.muscle_group || "",
    });
    setIsEditing(true);
    setExerciseModalVisible(true);
  };

  const addExerciseToTemplate = () => {
    setNewTemplate((prev) => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        {
          id: Date.now().toString(),
          exercise_id: "",
          sets: "3",
          reps: "10-12",
          minutes: "",
          rest_time: "60",
          day_of_week: "monday",
        },
      ],
    }));
  };

  const removeExerciseFromTemplate = (index: number) => {
    setNewTemplate((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index),
    }));
  };

  const updateExerciseInTemplate = (
    index: number,
    field: string,
    value: string
  ) => {
    setNewTemplate((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise, i) =>
        i === index ? { ...exercise, [field]: value } : exercise
      ),
    }));
  };
  const createTemplate = async () => {
    if (!newTemplate.name) {
      Alert.alert("Error", "El nombre de la plantilla es obligatorio");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: templateData, error: templateError } = await supabase
        .from("routine_templates")
        .insert([
          {
            name: newTemplate.name,
            description: newTemplate.description,
            difficulty: newTemplate.difficulty,
            duration_weeks: parseInt(newTemplate.duration_weeks),
            is_public: newTemplate.is_public,
            trainer_id: user.id,
          },
        ])
        .select()
        .limit(1);

      if (templateError) throw templateError;

      if (!templateData || templateData.length === 0) {
        throw new Error("No se pudo crear la plantilla");
      }

      if (newTemplate.exercises.length > 0) {
        const templateExercises = newTemplate.exercises
          .filter((exercise) => exercise.exercise_id)
          .map((exercise, index) => ({
            template_id: templateData[0].id,
            exercise_id: exercise.exercise_id,
            sets: parseInt(exercise.sets) || 3,
            reps: exercise.reps || "10-12",
            minutes: exercise.minutes || null,
            rest_time: exercise.rest_time || "60",
            day_of_week: exercise.day_of_week || "monday",
            order_index: index,
          }));

        if (templateExercises.length > 0) {
          const { error: exercisesError } = await supabase
            .from("template_exercises")
            .insert(templateExercises);
          if (exercisesError) throw exercisesError;
        }
      }

      Alert.alert("✅ Éxito", "Plantilla creada correctamente");
      setTemplateModalVisible(false);
      setNewTemplate({
        name: "",
        description: "",
        difficulty: "beginner",
        duration_weeks: "8",
        is_public: false,
        exercises: [],
      });
      loadTemplates();
    } catch (error: any) {
      console.error("❌ Error creando plantilla:", error);
      Alert.alert("❌ Error", error.message);
    }
  };
  const editTemplate = (template: any) => {
    setSelectedTemplate(template);

    const formattedExercises =
      template.template_exercises?.map((te: any) => {
        let repsValue = te.reps;
        if (typeof repsValue === "number") {
          repsValue = repsValue.toString();
        }

        return {
          id: te.id || Date.now().toString(),
          exercise_id: te.exercise_id,
          sets: te.sets?.toString() || "3",
          reps: repsValue || "10-12",
          minutes: te.minutes || "",
          rest_time: te.rest_time || "60",
          day_of_week: te.day_of_week || "monday",
        };
      }) || [];

    setNewTemplate({
      name: template.name,
      description: template.description || "",
      difficulty: template.difficulty,
      duration_weeks: template.duration_weeks.toString(),
      is_public: template.is_public,
      exercises: formattedExercises,
    });
    setTemplateEditing(true);
    setTemplateModalVisible(true);
  };

  const deleteTemplate = async (templateId: string) => {
    Alert.alert(
      "Confirmar Eliminación",
      "¿Estás seguro de que quieres eliminar esta plantilla?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await supabase
                .from("template_exercises")
                .delete()
                .eq("template_id", templateId);
              await supabase
                .from("routine_templates")
                .delete()
                .eq("id", templateId);
              Alert.alert("✅ Éxito", "Plantilla eliminada correctamente");
              loadTemplates();
            } catch (error: any) {
              Alert.alert("❌ Error", error.message);
            }
          },
        },
      ]
    );
  };

  const updateTemplate = async () => {
    if (!newTemplate.name) {
      Alert.alert("Error", "El nombre de la plantilla es obligatorio");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await supabase
        .from("routine_templates")
        .update({
          name: newTemplate.name,
          description: newTemplate.description,
          difficulty: newTemplate.difficulty,
          duration_weeks: parseInt(newTemplate.duration_weeks),
          is_public: newTemplate.is_public,
        })
        .eq("id", selectedTemplate.id);

      await supabase
        .from("template_exercises")
        .delete()
        .eq("template_id", selectedTemplate.id);

      if (newTemplate.exercises.length > 0) {
        const templateExercises = newTemplate.exercises
          .filter((exercise) => exercise.exercise_id)
          .map((exercise) => ({
            template_id: selectedTemplate.id,
            exercise_id: exercise.exercise_id,
            sets: exercise.sets,
            reps: exercise.reps,
            minutes: exercise.minutes,
            rest_time: exercise.rest_time,
            day_of_week: exercise.day_of_week,
          }));

        if (templateExercises.length > 0) {
          await supabase.from("template_exercises").insert(templateExercises);
        }
      }

      Alert.alert("✅ Éxito", "Plantilla actualizada correctamente");
      setTemplateModalVisible(false);
      setNewTemplate({
        name: "",
        description: "",
        difficulty: "beginner",
        duration_weeks: "8",
        is_public: false,
        exercises: [],
      });
      setSelectedTemplate(null);
      setTemplateEditing(false);
      loadTemplates();
    } catch (error: any) {
      Alert.alert("❌ Error", error.message);
    }
  };

  const addExerciseToRoutine = () => {
    setNewRoutine((prev) => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        {
          id: Date.now().toString(),
          exercise_id: "",
          sets: "3",
          reps: "12",
          minutes: "",
          rest_time: "60",
          day_of_week: "monday",
        },
      ],
    }));
  };

  const removeExerciseFromRoutine = (index: number) => {
    setNewRoutine((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index),
    }));
  };

  const updateExerciseInRoutine = (
    index: number,
    field: string,
    value: string
  ) => {
    setNewRoutine((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise, i) =>
        i === index ? { ...exercise, [field]: value } : exercise
      ),
    }));
  };

  const assignRoutine = async () => {
    if (!newRoutine.client_id || !newRoutine.name) {
      Alert.alert("Error", "Cliente y nombre de rutina son obligatorios");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      setLoading(true);
      console.log("🚀 Asignando rutina al cliente:", newRoutine.client_id);

      const { data: routineData, error: routineError } = await supabase
        .from("routines")
        .insert([
          {
            client_id: newRoutine.client_id,
            trainer_id: user.id,
            name: newRoutine.name,
            description: newRoutine.description,
            template_id: newRoutine.template_id || null,
            start_date: new Date().toISOString(),
            status: "active",
          },
        ])
        .select()
        .limit(1);

      if (routineError) {
        console.error("❌ Error creando rutina:", routineError);
        throw routineError;
      }

      if (!routineData || routineData.length === 0) {
        throw new Error("No se pudo crear la rutina");
      }

      console.log("✅ Rutina creada:", routineData[0].id); // ✅ CAMBIADO: routineData.id → routineData[0].id

      if (newRoutine.template_id) {
        console.log(
          "🔄 Copiando ejercicios del template:",
          newRoutine.template_id
        );

        const { data: templateExercises, error: templateError } = await supabase
          .from("template_exercises")
          .select("*")
          .eq("template_id", newRoutine.template_id);

        if (templateError) {
          console.error(
            "❌ Error obteniendo ejercicios del template:",
            templateError
          );
          throw templateError;
        }

        if (templateExercises && templateExercises.length > 0) {
          console.log(
            `📝 Encontrados ${templateExercises.length} ejercicios del template`
          );

          const routineExercises = templateExercises.map(
            (templateExercise) => ({
              routine_id: routineData[0].id, // ✅ CAMBIADO: routineData.id → routineData[0].id
              exercise_id: templateExercise.exercise_id,
              sets: templateExercise.sets || 3,
              reps: templateExercise.reps || "10-12",
              minutes: templateExercise.minutes || null,
              rest_time: templateExercise.rest_time || "60",
              day_of_week: templateExercise.day_of_week || "monday",
            })
          );

          console.log(
            "🔄 Insertando ejercicios en routine_exercises:",
            routineExercises
          );

          const { error: exercisesError } = await supabase
            .from("routine_exercises")
            .insert(routineExercises);

          if (exercisesError) {
            console.error(
              "❌ Error insertando ejercicios de rutina:",
              exercisesError
            );
            throw exercisesError;
          }

          console.log("✅ Ejercicios copiados del template a la rutina");
        } else {
          console.log("ℹ️ El template no tiene ejercicios para copiar");
        }
      }

      if (newRoutine.exercises.length > 0) {
        const validExercises = newRoutine.exercises.filter(
          (exercise) => exercise.exercise_id
        );

        if (validExercises.length > 0) {
          const manualExercises = validExercises.map((exercise) => ({
            routine_id: routineData[0].id, // ✅ CAMBIADO: routineData.id → routineData[0].id
            exercise_id: exercise.exercise_id,
            sets: parseInt(exercise.sets) || 3,
            reps: exercise.reps || "10-12",
            minutes: exercise.minutes || null,
            rest_time: exercise.rest_time || "60",
            day_of_week: exercise.day_of_week || "monday",
          }));

          console.log(
            "📝 Insertando ejercicios manuales:",
            manualExercises.length
          );

          const { error: manualExercisesError } = await supabase
            .from("routine_exercises")
            .insert(manualExercises);

          if (manualExercisesError) {
            console.error(
              "❌ Error insertando ejercicios manuales:",
              manualExercisesError
            );
            throw manualExercisesError;
          }
        }
      }

      Alert.alert(
        "✅ Éxito",
        "Rutina asignada correctamente con todos los ejercicios"
      );
      setRoutineModalVisible(false);
      setNewRoutine({
        name: "",
        description: "",
        client_id: "",
        template_id: "",
        exercises: [],
      });
      setEditingRoutine(null);

      await loadClientIndicators(newRoutine.client_id);
    } catch (error: any) {
      console.error("❌ Error asignando rutina:", error);
      Alert.alert("❌ Error", error.message || "Error al asignar la rutina");
    } finally {
      setLoading(false);
    }
  };

  const updateRoutine = async () => {
    if (!newRoutine.client_id || !newRoutine.name) {
      Alert.alert("Error", "Cliente y nombre de rutina son obligatorios");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await supabase
        .from("routines")
        .update({
          name: newRoutine.name,
          description: newRoutine.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingRoutine.id);

      await supabase
        .from("routine_exercises")
        .delete()
        .eq("routine_id", editingRoutine.id);

      if (newRoutine.exercises.length > 0) {
        const routineExercises = newRoutine.exercises
          .filter((exercise) => exercise.exercise_id)
          .map((exercise) => ({
            routine_id: editingRoutine.id,
            exercise_id: exercise.exercise_id,
            sets: parseInt(exercise.sets) || 3,
            reps: exercise.reps || "10-12",
            minutes: exercise.minutes || null,
            rest_time: exercise.rest_time || "60",
            day_of_week: exercise.day_of_week || "monday",
          }));

        if (routineExercises.length > 0) {
          await supabase.from("routine_exercises").insert(routineExercises);
        }
      }

      Alert.alert("✅ Éxito", "Rutina actualizada correctamente");
      setRoutineModalVisible(false);
      setNewRoutine({
        name: "",
        description: "",
        client_id: "",
        template_id: "",
        exercises: [],
      });
      setEditingRoutine(null);
      loadClientIndicators(newRoutine.client_id);
    } catch (error: any) {
      Alert.alert("❌ Error", error.message);
    }
  };

  const saveBodyMeasurements = async () => {
    if (!selectedClient) return;

    try {
      setLoading(true);

      if (
        !bodyMeasurements.height ||
        !bodyMeasurements.weight ||
        !bodyMeasurements.age
      ) {
        Alert.alert("Error", "Altura, peso y edad son campos obligatorios");
        return;
      }

      const {
        data: { user: trainer },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !trainer) {
        Alert.alert("Error", "No se pudo verificar el entrenador");
        return;
      }

      console.log("📏 Guardando medidas para cliente:", selectedClient.id);

      const age = parseInt(bodyMeasurements.age) || 0;
      const height = parseFloat(bodyMeasurements.height.replace(",", ".")) || 0;
      const weight = parseFloat(bodyMeasurements.weight.replace(",", ".")) || 0;
      const neck =
        parseFloat(bodyMeasurements.neck?.replace(",", ".") || "0") || 0;
      const shoulders =
        parseFloat(bodyMeasurements.shoulders?.replace(",", ".") || "0") || 0;
      const chest =
        parseFloat(bodyMeasurements.chest?.replace(",", ".") || "0") || 0;
      const arms =
        parseFloat(bodyMeasurements.arms?.replace(",", ".") || "0") || 0;
      const waist =
        parseFloat(bodyMeasurements.waist?.replace(",", ".") || "0") || 0;
      const glutes =
        parseFloat(bodyMeasurements.glutes?.replace(",", ".") || "0") || 0;
      const legs =
        parseFloat(bodyMeasurements.legs?.replace(",", ".") || "0") || 0;
      const calves =
        parseFloat(bodyMeasurements.calves?.replace(",", ".") || "0") || 0;

      const metrics = {
        age,
        gender: bodyMeasurements.gender,
        height,
        weight,
        neck,
        waist,
        hip: glutes,
      };

      const composition = BodyMetricsCalculator.calculateAllMetrics(metrics);

      const measurementData = {
        client_id: selectedClient.id,
        trainer_id: trainer.id,
        age,
        gender: bodyMeasurements.gender,
        height: height.toFixed(2),
        weight: weight.toFixed(2),
        neck: neck.toFixed(2),
        shoulders: shoulders.toFixed(2),
        chest: chest.toFixed(2),
        arms: arms.toFixed(2),
        waist: waist.toFixed(2),
        glutes: glutes.toFixed(2),
        legs: legs.toFixed(2),
        calves: calves.toFixed(2),
        injuries: bodyMeasurements.injuries || "Ninguna",
        measurement_date: new Date().toISOString().split("T")[0],

        bmi: composition.bmi,
        body_fat: composition.bodyFat,
        metabolic_age: composition.metabolicAge,
        muscle_mass: composition.muscleMass,
        water_percentage: composition.waterPercentage,
        bone_mass: composition.boneMass,
        visceral_fat: composition.visceralFat,
        fat_mass: composition.fatMass,
        lean_mass: composition.leanMass,

        created_at: new Date().toISOString(),
      };

      console.log("📊 Datos a insertar:", measurementData);

      const { data, error } = await supabase
        .from("body_measurements")
        .insert([measurementData])
        .select();

      if (error) {
        console.error("❌ Error de Supabase:", error);
        throw error;
      }

      console.log("✅ Medidas guardadas con composición corporal:", data);

      Alert.alert(
        "✅ Éxito",
        `Medidas guardadas correctamente\n\n` +
          `📊 Resumen:\n` +
          `• IMC: ${composition.bmi} (${BodyMetricsCalculator.getBMICategory(
            composition.bmi
          )})\n` +
          `• % Grasa: ${
            composition.bodyFat
          }% (${BodyMetricsCalculator.getBodyFatCategory(
            composition.bodyFat,
            bodyMeasurements.gender
          )})\n` +
          `• Masa Muscular: ${composition.muscleMass}kg\n` +
          `• Edad Metabólica: ${composition.metabolicAge} años`
      );

      setMeasurementModalVisible(false);
      setBodyMeasurements({
        age: "",
        gender: "male",
        height: "",
        weight: "",
        neck: "",
        shoulders: "",
        chest: "",
        arms: "",
        waist: "",
        glutes: "",
        legs: "",
        calves: "",
        injuries: "",
      });

      await loadClientIndicators(selectedClient.id);
      await loadClientHistory(selectedClient.id);
    } catch (error: any) {
      console.error("❌ Error completo guardando medidas:", error);
      Alert.alert("❌ Error", error.message || "Error al guardar las medidas");
    } finally {
      setLoading(false);
    }
  };
const handleEvaluationRequest = async (
  requestId: string,
  action: "accept" | "reject"
) => {
  console.log("🎯 Acción:", action, "para solicitud:", requestId);

  const request = evaluationRequests.find((req) => req.id === requestId);

  if (!request) {
    Alert.alert("Error", "No se encontró la solicitud");
    return;
  }

  const clientName = request.clients?.profiles?.full_name || "el cliente";

  if (action === "accept") {
    console.log("✅ Aceptando solicitud de:", clientName);
    
    // ✅ Establecer fecha por defecto (mañana)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const day = String(tomorrow.getDate()).padStart(2, "0");
    
    setSelectedDate(`${year}-${month}-${day}`);
    setSelectedTime("16:00"); // Hora por defecto
    
    // ✅ Guardar la solicitud
    setSelectedEvaluationRequest(request);
    
    // ✅ Mostrar el modal de programación
    setScheduleModalVisible(true);

  } else {
    // ✅ RECHAZAR LA SOLICITUD
    Alert.alert(
      "¿Rechazar solicitud?",
      `¿Estás seguro de rechazar la evaluación solicitada por ${clientName}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, rechazar",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from("evaluation_requests")
                .update({
                  status: "rejected",
                  rejection_reason: "Evaluación rechazada por el entrenador",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", requestId);

              if (error) {
                console.error("❌ Error rechazando:", error);
                Alert.alert("Error", error.message);
              } else {
                Alert.alert("✅ Éxito", "Solicitud rechazada");
                await loadEvaluationRequests(); // Recargar
              }
            } catch (error: any) {
              console.error("❌ Error:", error);
              Alert.alert("Error", error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }
};
  const toggleClientStatus = async (
    clientId: string,
    currentStatus: string
  ) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("clients")
      .update({ status: newStatus })
      .eq("id", clientId);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert(
        "✅ Éxito",
        `Socio ${newStatus === "active" ? "activado" : "inactivado"}`
      );
      loadClients();
    }
  };
  const deleteClientCompletely = async (clientId: string) => {
    Alert.alert(
      "Eliminar Permanentemente",
      "¿Estás seguro de que quieres ELIMINAR PERMANENTEMENTE este socio?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "ELIMINAR",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);

              const { data: clientData, error: clientError } = await supabase
                .from("clients")
                .select("user_id")
                .eq("id", clientId)
                .limit(1);

              if (clientError) {
                console.error(
                  "❌ Error obteniendo datos del cliente:",
                  clientError
                );
                throw new Error(
                  "No se pudo obtener la información del cliente"
                );
              }

              if (!clientData || clientData.length === 0) {
                throw new Error("No se encontró el cliente");
              }

              const userId = clientData[0].user_id; // ✅ CAMBIADO: clientData.user_id → clientData[0].user_id

              await supabase
                .from("body_measurements")
                .delete()
                .eq("client_id", clientId);

              const { data: routines, error: routinesError } = await supabase
                .from("routines")
                .select("id")
                .eq("client_id", clientId);

              if (routinesError) {
                console.error("❌ Error obteniendo rutinas:", routinesError);
              } else if (routines && routines.length > 0) {
                const routineIds = routines.map((r) => r.id);
                await supabase
                  .from("routine_exercises")
                  .delete()
                  .in("routine_id", routineIds);
                await supabase.from("routines").delete().in("id", routineIds);
              }

              await supabase
                .from("evaluation_requests")
                .delete()
                .or(
                  `current_trainer_id.eq.${userId},requested_trainer_id.eq.${userId},client_id.eq.${clientId}`
                );

              await supabase.from("clients").delete().eq("id", clientId);

              await supabase.from("profiles").delete().eq("id", userId);

              Alert.alert("✅ Éxito", "Socio eliminado permanentemente");
              loadClients();
            } catch (error: any) {
              console.error("❌ Error eliminando cliente:", error);
              Alert.alert(
                "❌ Error",
                error.message || "No se pudo eliminar el socio"
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ✅ FUNCIONES RENDER (se mantienen igual)
  const renderExerciseSearchModal = () => (
    <Modal
      animationType="slide"
      transparent={false}
      visible={exerciseSearchModalVisible}
    >
      <LinearGradient
        colors={["#1a1a1a", "#000000"]}
        style={styles.fullScreenModalContainer}
      >
        <View style={styles.searchHeader}>
          <Text style={styles.searchTitle}>🔍 BUSCAR EJERCICIO</Text>
          <TouchableOpacity
            style={styles.closeSearchButton}
            onPress={() => setExerciseSearchModalVisible(false)}
          >
            <Ionicons name="close" size={24} color="#FFD700" />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Escribe para buscar ejercicios..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus={true}
        />

        <ScrollView style={styles.fullScreenExercisesList}>
          {exercises
            .filter(
              (ex) =>
                ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ex.muscle_group
                  ?.toLowerCase()
                  .includes(searchQuery.toLowerCase())
            )
            .map((ex) => (
              <TouchableOpacity
                key={ex.id}
                style={styles.fullScreenExerciseOption}
                onPress={() => {
                  if (activeTab === "templates" || templateModalVisible) {
                    updateExerciseInTemplate(
                      currentExerciseIndex,
                      "exercise_id",
                      ex.id
                    );
                  } else {
                    updateExerciseInRoutine(
                      currentExerciseIndex,
                      "exercise_id",
                      ex.id
                    );
                  }
                  setExerciseSearchModalVisible(false);
                  setSearchQuery("");
                }}
              >
                <Text style={styles.fullScreenExerciseName}>{ex.name}</Text>
                {ex.muscle_group && (
                  <Text style={styles.fullScreenExerciseMuscle}>
                    💪 {ex.muscle_group}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
        </ScrollView>
      </LinearGradient>
    </Modal>
  );

  const renderClientsTab = () => {
    console.log("🔍 DEBUG - Renderizando clientes:", clients.length);
    console.log("🔍 DEBUG - Indicadores:", clientIndicators);

    // Agregar loading state mejorado
    if (loading && clients.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>CARGANDO CLIENTES...</Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <LinearGradient
            colors={["#FFD700", "#FFA000"]}
            style={styles.addButtonGradient}
          >
            <Text style={styles.addButtonText}>+ AGREGAR NUEVO SOCIO</Text>
          </LinearGradient>
        </TouchableOpacity>

        {clients.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>👥</Text>
            <Text style={styles.emptyStateTitle}>
              No hay socios registrados
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              Agrega tu primer socio para comenzar
            </Text>
          </View>
        ) : (
          clients.map((client) => {
            const clientName =
              client.profiles?.full_name ||
              client.full_name ||
              "Nombre no disponible";
            const clientEmail = client.profiles?.email || "Email no disponible";
            const branchName = client.branches?.name || "Sede no asignada";
            const indicators = clientIndicators[client.id] || {
              hasMeasurements: false,
              hasRoutine: false,
            };

            console.log(
              "🔍 DEBUG - Cliente:",
              clientName,
              client.id,
              indicators
            );

            return (
              <View key={client.id} style={styles.clientCard}>
                <LinearGradient
                  colors={["#2a2a2a", "#1a1a1a"]}
                  style={styles.cardGradient}
                >
                  <View style={styles.clientInfo}>
                    <View style={styles.clientHeader}>
                      <Text style={styles.clientName}>{clientName}</Text>
                      <View style={styles.clientIndicators}>
                        {indicators.hasMeasurements && (
                          <Text style={styles.measurementIndicator}>📊</Text>
                        )}
                        {indicators.hasRoutine && (
                          <Text style={styles.routineIndicator}>💪</Text>
                        )}
                        {!clientIndicators[client.id] && (
                          <Text style={styles.loadingIndicator}>⏳</Text>
                        )}
                      </View>
                    </View>
                    <Text style={styles.clientEmail}>{clientEmail}</Text>
                    <Text style={styles.clientDetail}>📍 {branchName}</Text>
                    <Text style={styles.clientDetail}>
                      🎯 {client.membership_type}
                    </Text>
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

                  <View style={styles.clientActions}>
                    <TouchableOpacity
                      style={styles.historyButton}
                      onPress={() => {
                        setSelectedClient(client);
                        loadClientHistory(client.id);
                        setHistoryModalVisible(true);
                      }}
                    >
                      <Text style={styles.historyButtonText}>📊</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.measureButton}
                      onPress={() => {
                        setSelectedClient(client);
                        setMeasurementModalVisible(true);
                      }}
                    >
                      <Text style={styles.measureButtonText}>📏</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.routineButton}
                      onPress={() => loadClientRoutine(client.id)}
                    >
                      <Text style={styles.routineButtonText}>
                        {indicators.hasRoutine ? "✏️" : "💪"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={
                        client.status === "active"
                          ? styles.inactiveButton
                          : styles.activeButton
                      }
                      onPress={() =>
                        toggleClientStatus(client.id, client.status)
                      }
                    >
                      <Text style={styles.statusButtonText}>
                        {client.status === "active" ? "🚫" : "✅"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteClientCompletely(client.id)}
                    >
                      <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            );
          })
        )}
      </View>
    );
  };

  const renderExercisesTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setSelectedExercise(null);
          setIsEditing(false);
          setNewExercise({
            name: "",
            description: "",
            video_url: "",
            muscle_group: "",
          });
          setExerciseModalVisible(true);
        }}
      >
        <LinearGradient
          colors={["#FF6B6B", "#FF4757"]}
          style={styles.addButtonGradient}
        >
          <Text style={styles.addButtonText}>+ CREAR NUEVO EJERCICIO</Text>
        </LinearGradient>
      </TouchableOpacity>

      {exercises.map((exercise) => (
        <View key={exercise.id} style={styles.exerciseCard}>
          <LinearGradient
            colors={["#2a2a2a", "#1a1a1a"]}
            style={styles.cardGradient}
          >
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              {exercise.description && (
                <Text style={styles.exerciseDescription}>
                  {exercise.description}
                </Text>
              )}
              {exercise.muscle_group && (
                <Text style={styles.muscleGroup}>
                  💪 {exercise.muscle_group}
                </Text>
              )}
              {exercise.video_url && (
                <View style={styles.videoContainer}>
                  <WebView
                    source={{ uri: exercise.video_url }}
                    style={styles.video}
                    allowsFullscreenVideo={true}
                  />
                </View>
              )}
            </View>
            <View style={styles.exerciseActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => editExercise(exercise)}
              >
                <Text style={styles.editButtonText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteExercise(exercise.id)}
              >
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      ))}
    </View>
  );

  const renderTemplatesTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setNewTemplate({
            name: "",
            description: "",
            difficulty: "beginner",
            duration_weeks: "8",
            is_public: false,
            exercises: [],
          });
          setTemplateEditing(false);
          setTemplateModalVisible(true);
        }}
      >
        <LinearGradient
          colors={["#4CAF50", "#45a049"]}
          style={styles.addButtonGradient}
        >
          <Text style={styles.addButtonText}>+ CREAR NUEVA PLANTILLA</Text>
        </LinearGradient>
      </TouchableOpacity>

      {templates.map((template) => (
        <View key={template.id} style={styles.templateCard}>
          <LinearGradient
            colors={["#2a2a2a", "#1a1a1a"]}
            style={styles.cardGradient}
          >
            <View style={styles.templateInfo}>
              <Text style={styles.templateName}>{template.name}</Text>
              {template.description && (
                <Text style={styles.templateDescription}>
                  {template.description}
                </Text>
              )}
              <View style={styles.templateDetails}>
                <Text style={styles.templateDetail}>
                  🎯{" "}
                  {template.difficulty === "beginner"
                    ? "PRINCIPIANTE"
                    : template.difficulty === "intermediate"
                    ? "INTERMEDIO"
                    : "AVANZADO"}
                </Text>
                <Text style={styles.templateDetail}>
                  📅 {template.duration_weeks} semanas
                </Text>
                <Text style={styles.templateDetail}>
                  👁️ {template.is_public ? "PÚBLICA" : "PRIVADA"}
                </Text>
                <Text style={styles.templateDetail}>
                  💪 {template.template_exercises?.length || 0} ejercicios
                </Text>
              </View>
            </View>
            <View style={styles.templateActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => editTemplate(template)}
              >
                <Text style={styles.editButtonText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteTemplate(template.id)}
              >
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      ))}
    </View>
  );

 const renderScheduleModal = () => {
  // Obtener información del cliente para mostrar
  const clientName = selectedEvaluationRequest?.clients?.profiles?.full_name || "Cliente";
  const clientEmail = selectedEvaluationRequest?.clients?.profiles?.email || "Sin email";
  const requestDate = selectedEvaluationRequest?.request_date || "No disponible";

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={scheduleModalVisible}
      onRequestClose={() => setScheduleModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <LinearGradient
          colors={["#1a1a1a", "#000000"]}
          style={styles.modalContentFull}
        >
          {/* Header */}
          <View style={styles.modalHeaderSafe}>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>📅 PROGRAMAR EVALUACIÓN</Text>
              <Text style={styles.modalSubtitle}>
                Cliente: {clientName}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => {
                setScheduleModalVisible(false);
                setSelectedEvaluationRequest(null);
                setSelectedDate("");
                setSelectedTime("");
                setEvaluationNotes("");
              }}
            >
              <Ionicons name="close" size={24} color="#FFD700" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollContent}>
            {/* Información del cliente */}
            <View style={styles.clientCardInModal}>
              <Text style={styles.clientCardTitle}>👤 INFORMACIÓN DEL CLIENTE</Text>
              <View style={styles.clientInfoRow}>
                <Text style={styles.clientInfoLabel}>Nombre:</Text>
                <Text style={styles.clientInfoValue}>{clientName}</Text>
              </View>
              <View style={styles.clientInfoRow}>
                <Text style={styles.clientInfoLabel}>Email:</Text>
                <Text style={styles.clientInfoValue}>{clientEmail}</Text>
              </View>
              <View style={styles.clientInfoRow}>
                <Text style={styles.clientInfoLabel}>Solicitó el:</Text>
                <Text style={styles.clientInfoValue}>{requestDate}</Text>
              </View>
            </View>

            {/* Selección de fecha */}
            <Text style={styles.label}>📅 FECHA DE EVALUACIÓN</Text>
            
            {Platform.OS === 'ios' ? (
              // Para iOS: usar DateTimePicker inline
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => {
                    if (date) {
                      setTempDate(date);
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      setSelectedDate(`${year}-${month}-${day}`);
                    }
                  }}
                  style={styles.datePicker}
                />
              </View>
            ) : (
              // Para Android: botón + modal
              <>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar" size={20} color="#FFD700" />
                  <Text style={styles.dateTimeButtonText}>
                    {selectedDate || "Toca para seleccionar fecha"}
                  </Text>
                </TouchableOpacity>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) {
                        setTempDate(date);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        setSelectedDate(`${year}-${month}-${day}`);
                      }
                    }}
                  />
                )}
              </>
            )}

            {/* Selección de hora */}
            <Text style={styles.label}>⏰ HORA DE EVALUACIÓN</Text>
            
            {Platform.OS === 'ios' ? (
              // Para iOS: usar DateTimePicker inline
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  display="spinner"
                  onChange={(event, time) => {
                    if (time) {
                      setTempTime(time);
                      const hours = String(time.getHours()).padStart(2, '0');
                      const minutes = String(time.getMinutes()).padStart(2, '0');
                      setSelectedTime(`${hours}:${minutes}`);
                    }
                  }}
                  style={styles.datePicker}
                />
              </View>
            ) : (
              // Para Android: botón + modal
              <>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Ionicons name="time" size={20} color="#FFD700" />
                  <Text style={styles.dateTimeButtonText}>
                    {selectedTime || "Toca para seleccionar hora"}
                  </Text>
                </TouchableOpacity>
                
                {showTimePicker && (
                  <DateTimePicker
                    value={tempTime}
                    mode="time"
                    display="default"
                    onChange={(event, time) => {
                      setShowTimePicker(false);
                      if (time) {
                        setTempTime(time);
                        const hours = String(time.getHours()).padStart(2, '0');
                        const minutes = String(time.getMinutes()).padStart(2, '0');
                        setSelectedTime(`${hours}:${minutes}`);
                      }
                    }}
                  />
                )}
              </>
            )}

            {/* Mostrar fecha/hora seleccionadas */}
            {(selectedDate || selectedTime) && (
              <View style={styles.selectedDateTime}>
                <Text style={styles.selectedDateTimeText}>
                  📅 <Text style={{color: '#FFD700'}}>Fecha:</Text> {selectedDate || "No seleccionada"}
                </Text>
                <Text style={styles.selectedDateTimeText}>
                  ⏰ <Text style={{color: '#FFD700'}}>Hora:</Text> {selectedTime || "No seleccionada"}
                </Text>
              </View>
            )}

            {/* Notas */}
            <Text style={styles.label}>📝 NOTAS PARA EL CLIENTE (Opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ej: 'Traer ropa deportiva', 'No desayunar antes', 'Lugar: Gimnasio principal'"
              placeholderTextColor="#666"
              value={evaluationNotes}
              onChangeText={setEvaluationNotes}
              multiline
              numberOfLines={4}
            />
          </ScrollView>

          {/* Botones */}
          <View style={styles.modalFixedFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setScheduleModalVisible(false);
                setSelectedEvaluationRequest(null);
                setSelectedDate("");
                setSelectedTime("");
                setEvaluationNotes("");
                setShowDatePicker(false);
                setShowTimePicker(false);
              }}
            >
              <Text style={styles.cancelButtonText}>CANCELAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!selectedDate || !selectedTime) && styles.disabledButton,
              ]}
              onPress={scheduleEvaluation}
              disabled={!selectedDate || !selectedTime || loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  ✅ PROGRAMAR EVALUACIÓN
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};
const renderEvaluationsTab = () => {
  console.log("🔍 Renderizando evaluaciones:", evaluationRequests.length);

  return (
    <View style={styles.tabContent}>
      <View style={styles.evaluationHeader}>
        <Text style={styles.sectionTitle}>📋 SOLICITUDES DE EVALUACIÓN</Text>
        <Text style={styles.sectionSubtitle}>
          Los clientes solicitan evaluaciones para medir su progreso
        </Text>
      </View>

      {evaluationRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { fontSize: 48 }]}>📭</Text>
          <Text style={styles.emptyStateTitle}>
            No hay solicitudes pendientes
          </Text>
          <Text style={styles.emptyStateSubtitle}>
            Cuando los clientes soliciten evaluaciones, aparecerán aquí
          </Text>
        </View>
      ) : (
        evaluationRequests.map((request) => {
          console.log("🔍 Procesando solicitud:", request);

          const clientName = request.clients?.profiles?.full_name || "Cliente";
          const clientEmail = request.clients?.profiles?.email || "Sin email";
          const requestDate = request.request_date
            ? new Date(request.request_date).toLocaleDateString("es-ES", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "Fecha no disponible";

          return (
            <View key={request.id} style={styles.evaluationCardSimple}>
              <LinearGradient
                colors={["#2a2a2a", "#1a1a1a"]}
                style={styles.evaluationCardGradient}
              >
                {/* CABECERA SIMPLE */}
                <View style={styles.evaluationHeaderSimple}>
                  <Ionicons name="person-circle" size={36} color="#FFD700" />
                  <View style={styles.evaluationClientInfoSimple}>
                    <Text style={styles.evaluationClientNameSimple}>
                      {clientName}
                    </Text>
                    <Text style={styles.evaluationClientEmailSimple}>
                      {clientEmail}
                    </Text>
                  </View>
                </View>

                {/* DETALLES */}
                <View style={styles.evaluationDetailsSimple}>
                  <Text style={styles.evaluationDateSimple}>
                    📅 Solicitado: {requestDate}
                  </Text>
                  {request.preferred_time && (
                    <Text style={styles.evaluationTimeSimple}>
                      ⏰ Prefiere: {request.preferred_time}
                    </Text>
                  )}
                  {request.notes && (
                    <Text style={styles.evaluationNotesSimple}>
                      📝 Notas: {request.notes}
                    </Text>
                  )}
                </View>

                {/* BOTONES SIMPLES - SOLO ACEPTAR/RECHAZAR */}
                <View style={styles.evaluationActionsSimple}>
                  <TouchableOpacity
                    style={styles.acceptButtonSimple}
                    onPress={() => handleEvaluationRequest(request.id, "accept")}
                  >
                    <LinearGradient
                      colors={["#4CAF50", "#2E7D32"]}
                      style={styles.acceptButtonGradientSimple}
                    >
                      <Ionicons name="checkmark" size={20} color="white" />
                      <Text style={styles.acceptButtonTextSimple}>
                        ACEPTAR
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.buttonsSpacer} />

                  <TouchableOpacity
                    style={styles.rejectButtonSimple}
                    onPress={() =>
                      handleEvaluationRequest(request.id, "reject")
                    }
                  >
                    <LinearGradient
                      colors={["#FF4444", "#C62828"]}
                      style={styles.rejectButtonGradientSimple}
                    >
                      <Ionicons name="close" size={20} color="white" />
                      <Text style={styles.rejectButtonTextSimple}>
                        RECHAZAR
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          );
        })
      )}
    </View>
  );
};

  const renderHistoryModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={historyModalVisible}
      onRequestClose={() => setHistoryModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <LinearGradient
          colors={["#1a1a1a", "#000000"]}
          style={styles.modalContentFull}
        >
          {/* Header con SafeArea */}
          <View style={styles.modalHeaderSafe}>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>📊 HISTORIAL DE MEDIDAS</Text>
              <Text style={styles.modalSubtitle}>
                Cliente:{" "}
                {selectedClient?.user_profiles?.full_name ||
                  selectedClient?.full_name ||
                  "Cliente"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setHistoryModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#FFD700" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
            contentContainerStyle={styles.scrollContentContainer}
          >
            {clientHistory.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>📈</Text>
                <Text style={styles.emptyStateTitle}>
                  No hay registros de medidas
                </Text>
                <Text style={styles.emptyStateSubtitle}>
                  Las medidas corporales aparecerán aquí después de ser
                  registradas
                </Text>
              </View>
            ) : (
              clientHistory.map((measurement, index) => (
                <View key={measurement.id} style={styles.historyItem}>
                  <LinearGradient
                    colors={["#2a2a2a", "#1a1a1a"]}
                    style={styles.historyGradient}
                  >
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyDate}>
                        📅{" "}
                        {new Date(
                          measurement.measurement_date
                        ).toLocaleDateString("es-ES")}
                      </Text>
                      <Text style={styles.historyIndex}>
                        Registro #{index + 1}
                      </Text>
                    </View>

                    <View style={styles.historyGrid}>
                      <View style={styles.historyColumn}>
                        <Text style={styles.historyLabel}>Edad:</Text>
                        <Text style={styles.historyValue}>
                          {measurement.age} años
                        </Text>
                        <Text style={styles.historyLabel}>Altura:</Text>
                        <Text style={styles.historyValue}>
                          {measurement.height} cm
                        </Text>
                        <Text style={styles.historyLabel}>Peso:</Text>
                        <Text style={styles.historyValue}>
                          {measurement.weight} kg
                        </Text>
                        <Text style={styles.historyLabel}>IMC:</Text>
                        <Text style={styles.historyValue}>
                          {measurement.bmi || "No calculado"}
                        </Text>
                      </View>
                      <View style={styles.historyColumn}>
                        <Text style={styles.historyLabel}>Grasa Corporal:</Text>
                        <Text style={styles.historyValue}>
                          {measurement.body_fat || "No calculado"}%
                        </Text>
                        <Text style={styles.historyLabel}>Masa Muscular:</Text>
                        <Text style={styles.historyValue}>
                          {measurement.muscle_mass || "No calculado"}%
                        </Text>
                        <Text style={styles.historyLabel}>Cintura:</Text>
                        <Text style={styles.historyValue}>
                          {measurement.waist} cm
                        </Text>
                        <Text style={styles.historyLabel}>Pecho:</Text>
                        <Text style={styles.historyValue}>
                          {measurement.chest} cm
                        </Text>
                      </View>
                    </View>

                    {measurement.injuries &&
                      measurement.injuries !== "Ninguna" && (
                        <Text style={styles.injuriesText}>
                          🩹 Lesiones/Consideraciones: {measurement.injuries}
                        </Text>
                      )}
                  </LinearGradient>
                </View>
              ))
            )}
          </ScrollView>

          {/* Botón único en footer */}
          <View style={styles.modalFixedFooter}>
            <TouchableOpacity
              style={[styles.confirmButton, { flex: 1 }]}
              onPress={() => setHistoryModalVisible(false)}
            >
              <Text style={styles.confirmButtonText}>CERRAR HISTORIAL</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );

  const renderClientModal = () => (
    <Modal animationType="slide" transparent={true} visible={modalVisible}>
      <View style={styles.modalContainer}>
        <LinearGradient
          colors={["#1a1a1a", "#000000"]}
          style={styles.modalContent}
        >
          <Text style={styles.modalTitle}>AGREGAR NUEVO SOCIO</Text>

          <Text style={styles.label}>👤 NOMBRE COMPLETO</Text>
          <TextInput
            style={styles.input}
            placeholder="Ingresa el nombre completo"
            placeholderTextColor="#666"
            value={newClient.full_name}
            onChangeText={(text) =>
              setNewClient({ ...newClient, full_name: text })
            }
          />

          <Text style={styles.label}>📧 CORREO ELECTRÓNICO</Text>
          <TextInput
            style={styles.input}
            placeholder="Ingresa el correo electrónico"
            placeholderTextColor="#666"
            value={newClient.email}
            onChangeText={(text) => setNewClient({ ...newClient, email: text })}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>🔒 CONTRASEÑA</Text>
          <TextInput
            style={styles.input}
            placeholder="Crea una contraseña"
            placeholderTextColor="#666"
            value={newClient.password}
            onChangeText={(text) =>
              setNewClient({ ...newClient, password: text })
            }
            secureTextEntry
          />

          <Text style={styles.label}>🎯 TIPO DE MEMBRESÍA</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Básica, Premium, VIP"
            placeholderTextColor="#666"
            value={newClient.membership_type}
            onChangeText={(text) =>
              setNewClient({ ...newClient, membership_type: text })
            }
          />

          <Text style={styles.label}>📍 SELECCIONAR SEDE</Text>
          <ScrollView style={styles.branchesList}>
            {branches.map((branch) => (
              <TouchableOpacity
                key={branch.id}
                style={[
                  styles.branchOption,
                  newClient.branch_id === branch.id && styles.selectedBranch,
                ]}
                onPress={() =>
                  setNewClient({ ...newClient, branch_id: branch.id })
                }
              >
                <Text
                  style={[
                    styles.branchText,
                    newClient.branch_id === branch.id &&
                      styles.selectedBranchText,
                  ]}
                >
                  {branch.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>CANCELAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!newClient.membership_type || loading) &&
                  styles.disabledButton,
              ]}
              onPress={createClient}
              disabled={loading || !newClient.membership_type}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.confirmButtonText}>CREAR SOCIO</Text>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );

  const renderExerciseModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={exerciseModalVisible}
    >
      <View style={styles.modalContainer}>
        <LinearGradient
          colors={["#1a1a1a", "#000000"]}
          style={styles.modalContent}
        >
          <Text style={styles.modalTitle}>
            {isEditing ? "EDITAR EJERCICIO" : "CREAR NUEVO EJERCICIO"}
          </Text>

          <Text style={styles.label}>💪 NOMBRE DEL EJERCICIO</Text>
          <TextInput
            style={styles.input}
            placeholder="Ingresa el nombre del ejercicio"
            placeholderTextColor="#666"
            value={newExercise.name}
            onChangeText={(text) =>
              setNewExercise({ ...newExercise, name: text })
            }
          />

          <Text style={styles.label}>📝 DESCRIPCIÓN</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Describe el ejercicio"
            placeholderTextColor="#666"
            value={newExercise.description}
            onChangeText={(text) =>
              setNewExercise({ ...newExercise, description: text })
            }
            multiline
          />

          <Text style={styles.label}>🎯 GRUPO MUSCULAR</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Pecho, Piernas, Espalda"
            placeholderTextColor="#666"
            value={newExercise.muscle_group}
            onChangeText={(text) =>
              setNewExercise({ ...newExercise, muscle_group: text })
            }
          />

          <Text style={styles.label}>🎥 URL DEL VIDEO (Opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ingresa la URL del video"
            placeholderTextColor="#666"
            value={newExercise.video_url}
            onChangeText={(text) =>
              setNewExercise({ ...newExercise, video_url: text })
            }
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setExerciseModalVisible(false);
                setSelectedExercise(null);
                setIsEditing(false);
              }}
            >
              <Text style={styles.cancelButtonText}>CANCELAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={createExercise}
            >
              <Text style={styles.confirmButtonText}>
                {isEditing ? "GUARDAR" : "CREAR"}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );

  const renderTemplateModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={templateModalVisible}
      onRequestClose={() => setTemplateModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <LinearGradient
          colors={["#1a1a1a", "#000000"]}
          style={styles.modalContentFull}
        >
          {/* Header con SafeArea */}
          <View style={styles.modalHeaderSafe}>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>
                {templateEditing ? "EDITAR PLANTILLA" : "CREAR NUEVA PLANTILLA"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setTemplateModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#FFD700" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
            contentContainerStyle={styles.scrollContentContainer}
          >
            <Text style={styles.label}>📋 NOMBRE DE LA PLANTILLA</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa el nombre de la plantilla"
              placeholderTextColor="#666"
              value={newTemplate.name}
              onChangeText={(text) =>
                setNewTemplate({ ...newTemplate, name: text })
              }
            />

            <Text style={styles.label}>📝 DESCRIPCIÓN</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe el propósito de esta plantilla"
              placeholderTextColor="#666"
              value={newTemplate.description}
              onChangeText={(text) =>
                setNewTemplate({ ...newTemplate, description: text })
              }
              multiline
            />

            <Text style={styles.label}>🎯 NIVEL DE DIFICULTAD</Text>
            <View style={styles.radioGroup}>
              {["beginner", "intermediate", "advanced"].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={styles.radioOption}
                  onPress={() =>
                    setNewTemplate({ ...newTemplate, difficulty: level })
                  }
                >
                  <View style={styles.radioCircle}>
                    {newTemplate.difficulty === level && (
                      <View style={styles.radioSelected} />
                    )}
                  </View>
                  <Text style={styles.radioText}>
                    {level === "beginner"
                      ? "PRINCIPIANTE"
                      : level === "intermediate"
                      ? "INTERMEDIO"
                      : "AVANZADO"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>📅 DURACIÓN EN SEMANAS</Text>
            <TextInput
              style={styles.input}
              placeholder="8"
              placeholderTextColor="#666"
              value={newTemplate.duration_weeks}
              onChangeText={(text) =>
                setNewTemplate({
                  ...newTemplate,
                  duration_weeks: text.replace(/[^0-9]/g, ""),
                })
              }
              keyboardType="numeric"
            />

            <Text style={styles.sectionLabel}>
              💪 EJERCICIOS DE LA PLANTILLA
            </Text>

            {newTemplate.exercises.map((exercise, index) => (
              <View key={exercise.id} style={styles.exerciseRow}>
                <LinearGradient
                  colors={["#2a2a2a", "#1a1a1a"]}
                  style={styles.exerciseGradient}
                >
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseNumber}>
                      Ejercicio {index + 1}
                    </Text>
                    <TouchableOpacity
                      style={styles.removeExerciseButton}
                      onPress={() => removeExerciseFromTemplate(index)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#FF6B6B"
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.subLabel}>SELECCIONAR EJERCICIO</Text>
                  <TouchableOpacity
                    style={styles.selectExerciseButton}
                    onPress={() => {
                      setCurrentExerciseIndex(index);
                      setExerciseSearchModalVisible(true);
                    }}
                  >
                    <Text style={styles.selectExerciseButtonText}>
                      {exercise.exercise_id
                        ? exercises.find((ex) => ex.id === exercise.exercise_id)
                            ?.name
                        : "🔍 SELECCIONAR EJERCICIO"}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.exerciseDetails}>
                    <View style={styles.detailInput}>
                      <Text style={styles.subLabel}>🔢 SERIES</Text>
                      <TextInput
                        style={styles.smallInput}
                        placeholder="3"
                        placeholderTextColor="#666"
                        value={exercise.sets}
                        onChangeText={(text) =>
                          updateExerciseInTemplate(index, "sets", text)
                        }
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.detailInput}>
                      <Text style={styles.subLabel}>🔄 REPETICIONES</Text>
                      <TextInput
                        style={styles.smallInput}
                        placeholder="10-12"
                        placeholderTextColor="#666"
                        value={exercise.reps}
                        onChangeText={(text) =>
                          updateExerciseInTemplate(index, "reps", text)
                        }
                      />
                    </View>
                    <View style={styles.detailInput}>
                      <Text style={styles.subLabel}>⏱️ MINUTOS</Text>
                      <TextInput
                        style={styles.smallInput}
                        placeholder="0"
                        placeholderTextColor="#666"
                        value={exercise.minutes}
                        onChangeText={(text) =>
                          updateExerciseInTemplate(index, "minutes", text)
                        }
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.detailInput}>
                      <Text style={styles.subLabel}>⏱️ DESCANSO</Text>
                      <TextInput
                        style={styles.smallInput}
                        placeholder="60"
                        placeholderTextColor="#666"
                        value={exercise.rest_time}
                        onChangeText={(text) =>
                          updateExerciseInTemplate(index, "rest_time", text)
                        }
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <Text style={styles.subLabel}>📅 DÍA DE LA SEMANA</Text>
                  <ScrollView horizontal style={styles.daysList}>
                    {[
                      "monday",
                      "tuesday",
                      "wednesday",
                      "thursday",
                      "friday",
                      "saturday",
                      "sunday",
                    ].map((day) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayOption,
                          exercise.day_of_week === day && styles.selectedDay,
                        ]}
                        onPress={() =>
                          updateExerciseInTemplate(index, "day_of_week", day)
                        }
                      >
                        <Text
                          style={[
                            styles.dayText,
                            exercise.day_of_week === day &&
                              styles.selectedDayText,
                          ]}
                        >
                          {day.charAt(0).toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </LinearGradient>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={addExerciseToTemplate}
            >
              <LinearGradient
                colors={["#4CAF50", "#45a049"]}
                style={styles.addExerciseButtonGradient}
              >
                <Text style={styles.addExerciseButtonText}>
                  + AGREGAR EJERCICIO
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkbox}
              onPress={() =>
                setNewTemplate({
                  ...newTemplate,
                  is_public: !newTemplate.is_public,
                })
              }
            >
              <View style={styles.checkboxBox}>
                {newTemplate.is_public && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
              <Text style={styles.checkboxText}>
                🌐 HACER PLANTILLA PÚBLICA
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Botones fijos */}
          <View style={styles.modalFixedFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setTemplateModalVisible(false);
                setSelectedTemplate(null);
                setTemplateEditing(false);
              }}
            >
              <Text style={styles.cancelButtonText}>CANCELAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={templateEditing ? updateTemplate : createTemplate}
            >
              <Text style={styles.confirmButtonText}>
                {templateEditing ? "GUARDAR" : "CREAR"}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
  const renderRoutineModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={routineModalVisible}
      onRequestClose={() => setRoutineModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <LinearGradient
          colors={["#1a1a1a", "#000000"]}
          style={styles.modalContentFull}
        >
          {/* Header con SafeArea - IGUAL QUE EL MODAL DE MEDIDAS */}
          <View style={styles.modalHeaderSafe}>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>
                {editingRoutine ? "EDITAR RUTINA" : "ASIGNAR RUTINA"}
              </Text>
              <Text style={styles.modalSubtitle}>
                Cliente:{" "}
                {selectedClient?.user_profiles?.full_name ||
                  selectedClient?.full_name ||
                  "Cliente"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setRoutineModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#FFD700" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
            contentContainerStyle={styles.scrollContentContainer}
          >
            <Text style={styles.label}>📋 NOMBRE DE LA RUTINA</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa el nombre de la rutina"
              placeholderTextColor="#666"
              value={newRoutine.name}
              onChangeText={(text) =>
                setNewRoutine({ ...newRoutine, name: text })
              }
            />

            <Text style={styles.label}>📝 DESCRIPCIÓN (Opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe los objetivos de esta rutina"
              placeholderTextColor="#666"
              value={newRoutine.description}
              onChangeText={(text) =>
                setNewRoutine({ ...newRoutine, description: text })
              }
              multiline
            />

            <Text style={styles.label}>
              📋 CARGAR DESDE PLANTILLA (Opcional)
            </Text>

            {/* DEBUG: Mostrar información de plantillas */}
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>
                Plantillas disponibles: {templates.length}
              </Text>
            </View>

            {templates.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>📋</Text>
                <Text style={styles.emptyStateTitle}>
                  No hay plantillas disponibles
                </Text>
                <Text style={styles.emptyStateSubtitle}>
                  Crea plantillas en la pestaña "Plantillas" para usarlas aquí
                </Text>
              </View>
            ) : (
              <View style={styles.templatesContainer}>
                <Text style={styles.subLabel}>
                  Selecciona una plantilla para cargar sus ejercicios
                  automáticamente:
                </Text>
                <ScrollView
                  style={styles.templatesList}
                  horizontal={false}
                  showsVerticalScrollIndicator={true}
                >
                  {templates.map((template) => (
                    <TouchableOpacity
                      key={template.id}
                      style={[
                        styles.templateOption,
                        newRoutine.template_id === template.id &&
                          styles.selectedTemplate,
                      ]}
                      onPress={() => {
                        console.log(
                          "🎯 Plantilla seleccionada:",
                          template.name,
                          template.id
                        );
                        setNewRoutine((prev) => ({
                          ...prev,
                          template_id: template.id,
                          name: template.name,
                          description: template.description || "",
                        }));
                        loadTemplateExercises(template.id);
                      }}
                    >
                      <View style={styles.templateInfoContainer}>
                        <Text
                          style={[
                            styles.templateOptionText,
                            newRoutine.template_id === template.id &&
                              styles.selectedTemplateText,
                          ]}
                        >
                          {template.name}
                        </Text>
                        {template.template_exercises && (
                          <Text style={styles.templateExerciseCount}>
                            {template.template_exercises.length} ejercicio(s)
                          </Text>
                        )}
                        {template.description && (
                          <Text style={styles.templateDescription}>
                            {template.description}
                          </Text>
                        )}
                        <Text style={styles.templateDetails}>
                          Dificultad:{" "}
                          {template.difficulty === "beginner"
                            ? "Principiante"
                            : template.difficulty === "intermediate"
                            ? "Intermedio"
                            : "Avanzado"}
                          • {template.duration_weeks} semanas
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={styles.sectionLabel}>💪 EJERCICIOS DE LA RUTINA</Text>

            {newRoutine.exercises.map((exercise, index) => (
              <View key={exercise.id} style={styles.exerciseRow}>
                <LinearGradient
                  colors={["#2a2a2a", "#1a1a1a"]}
                  style={styles.exerciseGradient}
                >
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseNumber}>
                      Ejercicio {index + 1}
                    </Text>
                    <TouchableOpacity
                      style={styles.removeExerciseButton}
                      onPress={() => removeExerciseFromRoutine(index)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#FF6B6B"
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.subLabel}>SELECCIONAR EJERCICIO</Text>
                  <TouchableOpacity
                    style={styles.selectExerciseButton}
                    onPress={() => {
                      setCurrentExerciseIndex(index);
                      setExerciseSearchModalVisible(true);
                    }}
                  >
                    <Text style={styles.selectExerciseButtonText}>
                      {exercise.exercise_id
                        ? exercises.find((ex) => ex.id === exercise.exercise_id)
                            ?.name
                        : "🔍 SELECCIONAR EJERCICIO"}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.exerciseDetails}>
                    <View style={styles.detailInput}>
                      <Text style={styles.subLabel}>🔢 SERIES</Text>
                      <TextInput
                        style={styles.smallInput}
                        placeholder="3"
                        placeholderTextColor="#666"
                        value={exercise.sets}
                        onChangeText={(text) =>
                          updateExerciseInRoutine(index, "sets", text)
                        }
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.detailInput}>
                      <Text style={styles.subLabel}>🔄 REPETICIONES</Text>
                      <TextInput
                        style={styles.smallInput}
                        placeholder="10-12"
                        placeholderTextColor="#666"
                        value={exercise.reps}
                        onChangeText={(text) =>
                          updateExerciseInRoutine(index, "reps", text)
                        }
                      />
                    </View>
                    <View style={styles.detailInput}>
                      <Text style={styles.subLabel}>⏱️ MINUTOS</Text>
                      <TextInput
                        style={styles.smallInput}
                        placeholder="0"
                        placeholderTextColor="#666"
                        value={exercise.minutes}
                        onChangeText={(text) =>
                          updateExerciseInRoutine(index, "minutes", text)
                        }
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.detailInput}>
                      <Text style={styles.subLabel}>⏱️ DESCANSO</Text>
                      <TextInput
                        style={styles.smallInput}
                        placeholder="60"
                        placeholderTextColor="#666"
                        value={exercise.rest_time}
                        onChangeText={(text) =>
                          updateExerciseInRoutine(index, "rest_time", text)
                        }
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <Text style={styles.subLabel}>📅 DÍA DE LA SEMANA</Text>
                  <ScrollView horizontal style={styles.daysList}>
                    {[
                      "monday",
                      "tuesday",
                      "wednesday",
                      "thursday",
                      "friday",
                      "saturday",
                      "sunday",
                    ].map((day) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayOption,
                          exercise.day_of_week === day && styles.selectedDay,
                        ]}
                        onPress={() =>
                          updateExerciseInRoutine(index, "day_of_week", day)
                        }
                      >
                        <Text
                          style={[
                            styles.dayText,
                            exercise.day_of_week === day &&
                              styles.selectedDayText,
                          ]}
                        >
                          {day.charAt(0).toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </LinearGradient>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={addExerciseToRoutine}
            >
              <LinearGradient
                colors={["#4CAF50", "#45a049"]}
                style={styles.addExerciseButtonGradient}
              >
                <Text style={styles.addExerciseButtonText}>
                  + AGREGAR EJERCICIO
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>

          {/* Botones fijos en la parte inferior - IGUAL QUE EL MODAL DE MEDIDAS */}
          <View style={styles.modalFixedFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setRoutineModalVisible(false);
                setEditingRoutine(null);
              }}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>CANCELAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, loading && styles.disabledButton]}
              onPress={editingRoutine ? updateRoutine : assignRoutine}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {editingRoutine ? "ACTUALIZAR" : "ASIGNAR"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );

  const renderMeasurementModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={measurementModalVisible}
      onRequestClose={() => setMeasurementModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <LinearGradient
          colors={["#1a1a1a", "#000000"]}
          style={styles.modalContentFull}
        >
          {/* Header con SafeArea */}
          <View style={styles.modalHeaderSafe}>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>📏 MEDIDAS CORPORALES</Text>
              <Text style={styles.modalSubtitle}>
                Cliente:{" "}
                {selectedClient?.user_profiles?.full_name ||
                  selectedClient?.full_name ||
                  "Cliente"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setMeasurementModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#FFD700" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
            contentContainerStyle={styles.scrollContentContainer}
          >
            <Text style={styles.sectionLabel}>📊 INFORMACIÓN BÁSICA</Text>

            <Text style={styles.label}>🎂 EDAD (años)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa la edad en años"
              placeholderTextColor="#666"
              value={bodyMeasurements.age}
              onChangeText={(text) =>
                setBodyMeasurements({
                  ...bodyMeasurements,
                  age: text.replace(/[^0-9]/g, ""),
                })
              }
              keyboardType="numeric"
            />

            <Text style={styles.label}>👤 GÉNERO</Text>
            <View style={styles.radioGroup}>
              {["male", "female"].map((gender) => (
                <TouchableOpacity
                  key={gender}
                  style={styles.radioOption}
                  onPress={() =>
                    setBodyMeasurements({
                      ...bodyMeasurements,
                      gender: gender as "male" | "female",
                    })
                  }
                >
                  <View style={styles.radioCircle}>
                    {bodyMeasurements.gender === gender && (
                      <View style={styles.radioSelected} />
                    )}
                  </View>
                  <Text style={styles.radioText}>
                    {gender === "male" ? "HOMBRE" : "MUJER"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>📏 ALTURA (cm)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 175.5"
              placeholderTextColor="#666"
              value={bodyMeasurements.height}
              onChangeText={(text) =>
                setBodyMeasurements({
                  ...bodyMeasurements,
                  height: text.replace(/[^0-9.,]/g, ""),
                })
              }
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>⚖️ PESO (kg)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 75.5"
              placeholderTextColor="#666"
              value={bodyMeasurements.weight}
              onChangeText={(text) =>
                setBodyMeasurements({
                  ...bodyMeasurements,
                  weight: text.replace(/[^0-9.,]/g, ""),
                })
              }
              keyboardType="decimal-pad"
            />

            <Text style={styles.sectionLabel}>📐 CIRCUNFERENCIAS (cm)</Text>

            <View style={styles.measurementsGrid}>
              <View style={styles.measurementColumn}>
                <Text style={styles.label}>📏 CUELLO</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Medida del cuello"
                  placeholderTextColor="#666"
                  value={bodyMeasurements.neck}
                  onChangeText={(text) =>
                    setBodyMeasurements({
                      ...bodyMeasurements,
                      neck: text.replace(/[^0-9.,]/g, ""),
                    })
                  }
                  keyboardType="decimal-pad"
                />

                <Text style={styles.label}>📏 HOMBROS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Medida de hombros"
                  placeholderTextColor="#666"
                  value={bodyMeasurements.shoulders}
                  onChangeText={(text) =>
                    setBodyMeasurements({
                      ...bodyMeasurements,
                      shoulders: text.replace(/[^0-9.,]/g, ""),
                    })
                  }
                  keyboardType="decimal-pad"
                />

                <Text style={styles.label}>📏 PECHO</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Medida del pecho"
                  placeholderTextColor="#666"
                  value={bodyMeasurements.chest}
                  onChangeText={(text) =>
                    setBodyMeasurements({
                      ...bodyMeasurements,
                      chest: text.replace(/[^0-9.,]/g, ""),
                    })
                  }
                  keyboardType="decimal-pad"
                />

                <Text style={styles.label}>📏 BRAZOS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Medida de brazos"
                  placeholderTextColor="#666"
                  value={bodyMeasurements.arms}
                  onChangeText={(text) =>
                    setBodyMeasurements({
                      ...bodyMeasurements,
                      arms: text.replace(/[^0-9.,]/g, ""),
                    })
                  }
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.measurementColumn}>
                <Text style={styles.label}>📏 CINTURA</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Medida de cintura"
                  placeholderTextColor="#666"
                  value={bodyMeasurements.waist}
                  onChangeText={(text) =>
                    setBodyMeasurements({
                      ...bodyMeasurements,
                      waist: text.replace(/[^0-9.,]/g, ""),
                    })
                  }
                  keyboardType="decimal-pad"
                />

                <Text style={styles.label}>📏 GLÚTEOS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Medida de glúteos"
                  placeholderTextColor="#666"
                  value={bodyMeasurements.glutes}
                  onChangeText={(text) =>
                    setBodyMeasurements({
                      ...bodyMeasurements,
                      glutes: text.replace(/[^0-9.,]/g, ""),
                    })
                  }
                  keyboardType="decimal-pad"
                />

                <Text style={styles.label}>📏 PIERNAS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Medida de piernas"
                  placeholderTextColor="#666"
                  value={bodyMeasurements.legs}
                  onChangeText={(text) =>
                    setBodyMeasurements({
                      ...bodyMeasurements,
                      legs: text.replace(/[^0-9.,]/g, ""),
                    })
                  }
                  keyboardType="decimal-pad"
                />

                <Text style={styles.label}>📏 PANTORRILLAS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Medida de pantorrillas"
                  placeholderTextColor="#666"
                  value={bodyMeasurements.calves}
                  onChangeText={(text) =>
                    setBodyMeasurements({
                      ...bodyMeasurements,
                      calves: text.replace(/[^0-9.,]/g, ""),
                    })
                  }
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Text style={styles.label}>
              ⚠️ LESIONES O CONSIDERACIONES ESPECIALES
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe cualquier lesión, condición médica o consideración especial..."
              placeholderTextColor="#666"
              value={bodyMeasurements.injuries}
              onChangeText={(text) =>
                setBodyMeasurements({ ...bodyMeasurements, injuries: text })
              }
              multiline
            />
          </ScrollView>

          {/* Botones fijos en la parte inferior */}
          <View style={styles.modalFixedFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setMeasurementModalVisible(false)}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>CANCELAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, loading && styles.disabledButton]}
              onPress={saveBodyMeasurements}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.confirmButtonText}>GUARDAR MEDIDAS</Text>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );

  return (
    <LinearGradient colors={["#0c0c0c", "#000000"]} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={styles.header}>
        <LinearGradient
          colors={["#000000", "#1a1a1a"]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={onRefresh}
              >
                <Ionicons name="refresh" size={24} color="#FFD700" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={24} color="#FFD700" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.tabContainer}>
        {[
          {
            key: "clients" as const,
            label: "👥 SOCIOS",
            count: clients.length,
            color: ["#FFD700", "#FFA000"] as [string, string],
          },
          {
            key: "exercises" as const,
            label: "💪 EJERCICIOS",
            count: exercises.length,
            color: ["#FF6B6B", "#FF4757"] as [string, string],
          },
          {
            key: "templates" as const,
            label: "📋 PLANTILLAS",
            count: templates.length,
            color: ["#4CAF50", "#45a049"] as [string, string],
          },
          {
            key: "evaluations" as const,
            label: "📊 EVALUACIONES",
            count: evaluationRequests.length,
            color: ["#007AFF", "#0056b3"] as [string, string],
          },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <LinearGradient
              colors={
                activeTab === tab.key
                  ? tab.color
                  : (["#2a2a2a", "#1a1a1a"] as [string, string])
              }
              style={styles.tabGradient}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
              <Text
                style={[
                  styles.tabCount,
                  activeTab === tab.key && styles.activeTabCount,
                ]}
              >
                ({tab.count})
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFD700"
          />
        }
        style={styles.content}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>CARGANDO DATOS...</Text>
          </View>
        ) : (
          <>
            {activeTab === "clients" && renderClientsTab()}
            {activeTab === "exercises" && renderExercisesTab()}
            {activeTab === "templates" && renderTemplatesTab()}
            {activeTab === "evaluations" && renderEvaluationsTab()}
          </>
        )}
      </ScrollView>

      {renderClientModal()}
      {renderExerciseModal()}
      {renderTemplateModal()}
      {renderRoutineModal()}
      {renderMeasurementModal()}
      {renderHistoryModal()}
      {renderExerciseSearchModal()}
      {renderScheduleModal()}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    paddingTop:
      Platform.OS === "ios" ? 50 : (StatusBar.currentHeight || 0) + 10,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#FFD700",
  },
  headerGradient: {
    paddingHorizontal: width > 400 ? 20 : 15,
    paddingVertical: 10,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoContainer: {
    flex: 1,
    alignItems: "flex-start",
  },
  logo: {
    width: width > 400 ? 200 : 160,
    height: width > 400 ? 40 : 32,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 8,
  },
  logoutButton: {
    padding: 8,
    backgroundColor: "rgba(255, 69, 58, 0.1)",
    borderRadius: 8,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: width > 400 ? 15 : 10,
    marginTop: 10,
    borderRadius: 15,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: "#000000",
  },
  tab: {
    flex: 1,
    margin: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  tabGradient: {
    padding: width > 400 ? 12 : 8,
    alignItems: "center",
    borderRadius: 12,
  },
  activeTab: {
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  tabText: {
    fontSize: width > 400 ? 10 : 8,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  activeTabText: {
    color: "#000000",
    fontWeight: "900",
  },
  tabCount: {
    fontSize: 8,
    color: "#CCCCCC",
    marginTop: 2,
  },
  activeTabCount: {
    color: "#000000",
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    backgroundColor: "#000000",
  },
  tabContent: {
    padding: 15,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 50,
  },
  loadingText: {
    marginTop: 20,
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "bold",
  },
  addButton: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  addButtonText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "bold",
  },
  cardGradient: {
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  clientCard: {
    borderRadius: 12,
    overflow: "hidden",
  },
  clientInfo: {
    flex: 1,
  },
  clientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 12,
    color: "#CCCCCC",
    marginBottom: 6,
  },
  clientDetail: {
    fontSize: 11,
    color: "#999999",
    marginBottom: 3,
  },
  clientStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  activeStatus: {
    backgroundColor: "#00C851",
  },
  inactiveStatus: {
    backgroundColor: "#FF4444",
  },
  clientStatusText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },
  clientActions: {
    flexDirection: "row",
    gap: 6,
  },
  historyButton: {
    backgroundColor: "#6f42c1",
    padding: 8,
    borderRadius: 8,
  },
  historyButtonText: {
    color: "white",
    fontSize: 12,
  },
  measureButton: {
    backgroundColor: "#007AFF",
    padding: 8,
    borderRadius: 8,
  },
  measureButtonText: {
    color: "white",
    fontSize: 12,
  },
  routineButton: {
    backgroundColor: "#28a745",
    padding: 8,
    borderRadius: 8,
  },
  routineButtonText: {
    color: "white",
    fontSize: 12,
  },
  activeButton: {
    backgroundColor: "#28a745",
    padding: 8,
    borderRadius: 8,
  },
  inactiveButton: {
    backgroundColor: "#ffc107",
    padding: 8,
    borderRadius: 8,
  },
  statusButtonText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "bold",
  },
  deleteButton: {
    backgroundColor: "#dc3545",
    padding: 8,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: "white",
    fontSize: 12,
  },
  exerciseCard: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  exerciseInfo: {
    flex: 1,
    marginBottom: 10,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF6B6B",
    marginBottom: 5,
  },
  exerciseDescription: {
    fontSize: 12,
    color: "#CCCCCC",
    marginBottom: 8,
    lineHeight: 16,
  },
  muscleGroup: {
    fontSize: 11,
    color: "#FFD700",
    fontWeight: "600",
  },
  videoContainer: {
    marginTop: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: 180,
  },
  exerciseActions: {
    flexDirection: "row",
    gap: 6,
  },
  editButton: {
    backgroundColor: "#FFD700",
    padding: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "bold",
  },
  templateCard: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  templateInfo: {
    flex: 1,
    marginBottom: 10,
  },
  templateName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 5,
  },
  templateDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  templateDetail: {
    fontSize: 9,
    color: "#CCCCCC",
    backgroundColor: "#333333",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  templateActions: {
    flexDirection: "row",
    gap: 6,
  },

  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyStateText: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: "#CCCCCC",
    textAlign: "center",
    lineHeight: 18,
  },
  requestCard: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  requestInfo: {
    flex: 1,
    marginBottom: 10,
  },
  requestClient: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFA500",
    marginBottom: 6,
  },
  requestType: {
    fontSize: 12,
    color: "#CCCCCC",
    marginBottom: 6,
  },
  requestDate: {
    fontSize: 10,
    color: "#CCCCCC",
    marginBottom: 8,
  },
  requestStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  pendingStatus: {
    backgroundColor: "#FFD700",
  },
  acceptedStatus: {
    backgroundColor: "#00C851",
  },
  rejectedStatus: {
    backgroundColor: "#FF4444",
  },
  requestStatusText: {
    color: "#000000",
    fontSize: 9,
    fontWeight: "bold",
  },
  requestActions: {
    flexDirection: "row",
    gap: 6,
  },
  acceptButton: {
    backgroundColor: "#00C851",
    padding: 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "bold",
  },
  rejectButton: {
    backgroundColor: "#FF4444",
    padding: 8,
    borderRadius: 8,
  },
  rejectButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },

  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: Platform.OS === "ios" ? 20 : 0,
  },
  modalContent: {
    padding: 20,
    borderRadius: 15,
    width: "90%",
    maxHeight: "85%",
  },
  modalContentScroll: {
    width: "100%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#FFD700",
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
    color: "#CCCCCC",
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 15,
    color: "#FFD700",
  },
  // Para el calendario y hora
  label: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 10,
  },
  subLabel: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#CCCCCC",
  },
  // Inputs responsive
  input: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: Platform.OS === "ios" ? 15 : 12,
    color: "#fff",
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  smallInput: {
    borderWidth: 1,
    borderColor: "#333333",
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#1a1a1a",
    color: "#FFFFFF",
    fontSize: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  clientIndicators: {
    flexDirection: "row",
    gap: 6,
  },
  measurementIndicator: {
    fontSize: 14,
  },
  routineIndicator: {
    fontSize: 14,
  },

  // Exercise Search Modal Styles
  fullScreenModalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  searchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#FFD700",
  },
  searchTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFD700",
  },
  closeSearchButton: {
    padding: 6,
  },
  searchInput: {
    backgroundColor: "#1a1a1a",
    color: "#FFF",
    padding: 15,
    margin: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFD700",
    fontSize: 14,
  },
  fullScreenExercisesList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  fullScreenExerciseOption: {
    backgroundColor: "#1a1a1a",
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#FFD700",
  },
  fullScreenExerciseName: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  fullScreenExerciseMuscle: {
    color: "#CCCCCC",
    fontSize: 11,
  },

  // History Modal Styles
  historyList: {
    maxHeight: 400,
    marginBottom: 20,
  },
  historyItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  historyGradient: {
    padding: 16,
    borderRadius: 12,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  historyDate: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFD700",
  },
  historyIndex: {
    fontSize: 12,
    color: "#CCCCCC",
    backgroundColor: "#333333",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  historyGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  historyColumn: {
    flex: 1,
  },
  historyLabel: {
    fontSize: 11,
    color: "#CCCCCC",
    marginBottom: 4,
    marginTop: 6,
  },
  historyValue: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  injuriesText: {
    fontSize: 11,
    color: "#FF6B6B",
    marginTop: 12,
    fontStyle: "italic",
  },
  closeButton: {
    backgroundColor: "#FFD700",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  closeButtonText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "bold",
  },

  // Branch Selection Styles
  branchesList: {
    maxHeight: 150,
    marginBottom: 15,
  },
  branchOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: "#1a1a1a",
  },
  selectedBranch: {
    backgroundColor: "#FFD700",
  },
  branchText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  selectedBranchText: {
    color: "#000000",
    fontWeight: "bold",
  },

  // Modal Buttons
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    backgroundColor: "#333",
    borderRadius: 8,
    marginRight: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  confirmButton: {
    flex: 1,
    padding: 15,
    backgroundColor: "#FFD700",
    borderRadius: 8,
    marginLeft: 10,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Radio Group Styles
  radioGroup: {
    flexDirection: "row",
    marginBottom: 15,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#FFD700",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFD700",
  },
  radioText: {
    color: "#FFFFFF",
    fontSize: 12,
  },

  // Exercise Row Styles
  exerciseRow: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  exerciseGradient: {
    padding: 16,
    borderRadius: 12,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  exerciseNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFD700",
  },
  loadingIndicator: {
    fontSize: 14,
    color: "#FFD700",
  },
  removeExerciseButton: {
    padding: 6,
  },
  selectExerciseButton: {
    backgroundColor: "#333333",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  selectExerciseButtonText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  exerciseDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailInput: {
    width: "48%",
    marginBottom: 8,
  },
  daysList: {
    flexDirection: "row",
    marginBottom: 12,
  },
  dayOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#333333",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  selectedDay: {
    backgroundColor: "#FFD700",
  },
  dayText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  selectedDayText: {
    color: "#000000",
  },
  addExerciseButton: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  addExerciseButtonGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  addExerciseButtonText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "bold",
  },

  // Checkbox Styles
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#FFD700",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "#1a1a1a",
  },
  checkboxText: {
    color: "#FFFFFF",
    fontSize: 12,
  },

  // Templates List Styles
  templatesList: {
    maxHeight: 120,
    marginBottom: 15,
  },
  templateOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: "#1a1a1a",
  },
  selectedTemplate: {
    backgroundColor: "#FFD700",
  },
  templateExerciseCount: {
    fontSize: 10,
    color: "#666",
    fontStyle: "italic",
  },
  templateDescription: {
    fontSize: 10,
    color: "#999",
    marginTop: 4,
  },
  templateOptionText: {
    color: "#FFFFFF",
    fontSize: 12,
  },
  selectedTemplateText: {
    color: "#000000",
    fontWeight: "bold",
  },
  debugInfo: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#FFD700",
  },
  debugText: {
    color: "#FFD700",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  templatesContainer: {
    marginBottom: 15,
  },
  templateInfoContainer: {
    flex: 1,
  },

  modalContentFull: {
    width: Platform.OS === "web" ? "50%" : "95%",
    maxWidth: 500,
    maxHeight: "80%",
    backgroundColor: "#1a1a1a",
    borderRadius: 15,
    overflow: "hidden",
  },
  modalHeaderSafe: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  closeModalButton: {
    padding: 8,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 8,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  scrollContentContainer: {
    paddingBottom: 120, // Espacio para los botones fijos
  },
  modalFixedFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#333",
    backgroundColor: "#1a1a1a",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  measurementsGrid: {
    flexDirection: width > 400 ? "row" : "column",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  measurementColumn: {
    width: width > 400 ? "48%" : "100%",
    marginBottom: width > 400 ? 0 : 10,
  },

  instructionBox: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "flex-start",
  },
  instructionText: {
    color: "#FFD700",
    fontSize: 14,
    flex: 1,
    marginLeft: 10,
  },
  evaluationRequestCard: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  evaluationRequestInfo: {
    flex: 1,
    marginBottom: 10,
  },

  evaluationClient: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFD700",
  },
  evaluationDate: {
    fontSize: 12,
    color: "#CCCCCC",
  },
  evaluationEmail: {
    fontSize: 12,
    color: "#999999",
    marginBottom: 6,
  },
  evaluationPreference: {
    fontSize: 12,
    color: "#4CAF50",
    marginBottom: 4,
  },
  evaluationNotes: {
    fontSize: 11,
    color: "#CCCCCC",
    fontStyle: "italic",
    marginBottom: 8,
    backgroundColor: "#333333",
    padding: 8,
    borderRadius: 6,
  },
  evaluationStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  scheduledStatus: {
    backgroundColor: "#4CAF50",
  },
  completedStatus: {
    backgroundColor: "#007AFF",
  },
  evaluationStatusText: {
    color: "#000000",
    fontSize: 10,
    fontWeight: "bold",
  },
  evaluationActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  scheduleButton: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  scheduleButtonGradient: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    marginBottom: 10,
  },
  dateTimeButtonText: {
    color: "#FFD700",
    marginLeft: 10,
    fontSize: 16,
    flex: 1,
  },
  scheduleButtonText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "bold",
  },
  rejectButtonGradient: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  scheduledInfo: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#4CAF50",
  },
  scheduledText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
  },

  dateTimeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  dateInput: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 15,
    color: "#fff",
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#333",
    minHeight: 50,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#333333",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
    color: "#FFFFFF",
    fontSize: 14,
    marginLeft: 10,
  },
  // Agrega estos estilos al final del objeto styles (antes del cierre }):
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },

  // Estilos para la cabecera de la evaluación
  evaluationClientHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  clientAvatar: {
    marginRight: 12,
  },

  // Estilos para el cliente de la evaluación
  evaluationClientName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFD700",
  },
  evaluationClientEmail: {
    fontSize: 12,
    color: "#CCCCCC",
    marginTop: 4,
  },

  // Estilos para los detalles de la evaluación
  evaluationDetails: {
    marginBottom: 15,
  },
  evaluationDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  evaluationDetailText: {
    fontSize: 12,
    color: "#FFFFFF",
    marginLeft: 8,
  },

  // Estilos para el badge de estado
  evaluationStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  pendingBadge: {
    backgroundColor: "#FFD700",
  },
  scheduledBadge: {
    backgroundColor: "#4CAF50",
  },
  completedBadge: {
    backgroundColor: "#007AFF",
  },
  rejectedBadge: {
    backgroundColor: "#FF4444",
  },

  // Estilos para los botones de acción
  evaluationActionsContainer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  scheduleActionButton: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  scheduleActionGradient: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  scheduleActionText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "bold",
  },
  rejectActionButton: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  rejectActionGradient: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  rejectActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },

  // Estilos para información programada
  scheduledInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#4CAF50",
    marginTop: 10,
  },
  scheduledInfoText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },

  clientInfoBox: {
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#444",
  },
  infoBoxTitle: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    color: "#999",
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    color: "#fff",
    fontSize: 14,
    flex: 2,
    textAlign: "right",
  },
  // Agrega esto en tu objeto StyleSheet:

clientCardInModal: {
  backgroundColor: '#2a2a2a',
  borderRadius: 10,
  padding: 15,
  marginBottom: 20,
  borderWidth: 1,
  borderColor: '#FFD700',
},
clientCardTitle: {
  color: '#FFD700',
  fontSize: 16,
  fontWeight: 'bold',
  marginBottom: 12,
  textAlign: 'center',
},
clientInfoRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 8,
  paddingHorizontal: 5,
},
clientInfoLabel: {
  color: '#999',
  fontSize: 14,
  flex: 1,
},
clientInfoValue: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '500',
  flex: 2,
  textAlign: 'right',
},
datePickerContainer: {
  backgroundColor: '#2a2a2a',
  borderRadius: 10,
  marginBottom: 15,
  padding: 10,
},
datePicker: {
  height: 120,
},
selectedDateTime: {
  backgroundColor: '#2a2a2a',
  borderRadius: 10,
  padding: 15,
  marginTop: 10,
  marginBottom: 20,
  borderWidth: 1,
  borderColor: '#4CAF50',
},
selectedDateTimeText: {
  color: '#fff',
  fontSize: 16,
  marginBottom: 5,
},
evaluationCardSimple: {
  marginBottom: 15,
  borderRadius: 12,
  overflow: "hidden",
  borderWidth: 1,
  borderColor: "#333",
},
evaluationHeaderSimple: {
  flexDirection: "row",
  alignItems: "center",
  padding: 15,
  borderBottomWidth: 1,
  borderBottomColor: "#333",
},

evaluationClientNameSimple: {
  fontSize: 16,
  fontWeight: "bold",
  color: "#FFD700",
  marginBottom: 4,
},
evaluationClientEmailSimple: {
  fontSize: 12,
  color: "#CCCCCC",
},
evaluationDateSimple: {
  fontSize: 12,
  color: "#FFFFFF",
  marginBottom: 8,
},


acceptButtonSimple: {
  flex: 1,
  marginRight: 5,
},
acceptButtonTextSimple: {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: "bold",
},

rejectButtonGradientSimple: {
  flexDirection: "row",
  padding: 12,
  borderRadius: 8,
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
},
 // ESTILOS ESPECÍFICOS PARA EVALUACIONES RESPONSIVAS
  evaluationCardGradient: {
    padding: 16,
    borderRadius: 12,
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 200, // Altura mínima para asegurar que los botones tengan espacio
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },


  evaluationClientInfoSimple: {
    marginLeft: 12,
    flex: 1,
  },




  evaluationDetailsSimple: {
    marginBottom: 20,
    paddingHorizontal: 5,
  },



  evaluationTimeSimple: {
    fontSize: 14,
    color: "#4CAF50",
    marginBottom: 8,
  },

  evaluationNotesSimple: {
    fontSize: 12,
    color: "#FFA500",
    fontStyle: "italic",
    backgroundColor: "#333333",
    padding: 10,
    borderRadius: 6,
    marginTop: 5,
  },

  // CONTENEDOR DE BOTONES MEJORADO
  evaluationActionsSimple: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto', // Esto empuja los botones hacia abajo
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
    width: '100%',
  },



  acceptButtonGradientSimple: {
    flex: 1,
    flexDirection: "row",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    height: '100%',
  },



  // BOTÓN RECHAZAR
  rejectButtonSimple: {
    flex: 1,
    marginLeft: 5,
    height: 50, // Altura fija para mejor visibilidad
  },



  rejectButtonTextSimple: {
    color: "#FFFFFF",
    fontSize: 16, // Tamaño aumentado
    fontWeight: "bold",
    marginLeft: 8,
  },

  buttonsSpacer: {
    width: 10, // Espacio entre botones
  },

  // ESTILOS PARA MEJORAR LA RESPONSIVIDAD EN PANTALLAS PEQUEÑAS
  evaluationHeader: {
    marginBottom: 20,
    paddingHorizontal: 10,
  },

  sectionTitle: {
    fontSize: width > 400 ? 22 : 18,
    fontWeight: "bold",
    color: "#FFD700",
    textAlign: "center",
    marginBottom: 8,
  },

  sectionSubtitle: {
    fontSize: width > 400 ? 14 : 12,
    color: "#CCCCCC",
    textAlign: "center",
    lineHeight: 20,
  },
});
