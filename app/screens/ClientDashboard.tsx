import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { BodyMetricsCalculator } from "../../lib/bodyMetrics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import WebView from "react-native-webview";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function ClientDashboard() {
     const [loadingTrainers, setLoadingTrainers] = useState(false); // ✅ AÑADIR ESTA LÍNEA
     const [preferredTime, setPreferredTime] = useState("");
  const [evaluationNotes, setEvaluationNotes] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [clientData, setClientData] = useState<any>(null);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [routines, setRoutines] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [evaluationRequests, setEvaluationRequests] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState("");
  const [currentRoutine, setCurrentRoutine] = useState<any>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseTimer, setExerciseTimer] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  
  const [isExerciseActive, setIsExerciseActive] = useState(false);
  const [isRestActive, setIsRestActive] = useState(false);
  const [currentSet, setCurrentSet] = useState(1);
  const [isRoutineStarted, setIsRoutineStarted] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [daySelectionModalVisible, setDaySelectionModalVisible] =
  
    useState(false);
  const [exerciseProgress, setExerciseProgress] = useState(
    new Animated.Value(0)
  );
  const [measurementDetailModalVisible, setMeasurementDetailModalVisible] =
    useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState<any>(null);



  // Días de la semana en español
  const daysOfWeek = [
    { key: "monday", label: "Lunes", short: "LUN" },
    { key: "tuesday", label: "Martes", short: "MAR" },
    { key: "wednesday", label: "Miércoles", short: "MIE" },
    { key: "thursday", label: "Jueves", short: "JUE" },
    { key: "friday", label: "Viernes", short: "VIE" },
    { key: "saturday", label: "Sábado", short: "SAB" },
    { key: "sunday", label: "Domingo", short: "DOM" },
  ];


  

  useEffect(() => {
    loadAllData();
  }, []);

  // Obtener el día actual automáticamente al cargar
  useEffect(() => {
    if (currentRoutine) {
      const today = getToday();
      setSelectedDay(today);
      // Debuggear distribución de ejercicios
      debugExerciseDistribution();
    }
  }, [currentRoutine]);


  // MEJORADO: Función para obtener el día actual con mejor detección
  const getToday = () => {
    const days = [
      "sunday",    // 0 - Domingo
      "monday",    // 1 - Lunes
      "tuesday",   // 2 - Martes
      "wednesday", // 3 - Miércoles
      "thursday",  // 4 - Jueves
      "friday",    // 5 - Viernes
      "saturday"   // 6 - Sábado
    ];
    const todayIndex = new Date().getDay();
    const today = days[todayIndex];
    
    console.log(`📅 DETECCIÓN DE DÍA:`);
    console.log(`   Índice: ${todayIndex}`);
    console.log(`   Día: ${today}`);
    console.log(`   Nombre: ${getDayName(today)}`);
    
    return today;
  };

  const getDayName = (day: string) => {
    const days: { [key: string]: string } = {
      monday: "Lunes",
      tuesday: "Martes",
      wednesday: "Miércoles",
      thursday: "Jueves",
      friday: "Viernes",
      saturday: "Sábado",
      sunday: "Domingo",
    };
    return days[day] || day;
  };

  // NUEVO: Función para debuggear la distribución de ejercicios
  const debugExerciseDistribution = () => {
    if (!currentRoutine?.routine_exercises) return;
    
    console.log("=== DISTRIBUCIÓN DE EJERCICIOS POR DÍA ===");
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    
    days.forEach(day => {
      const exercises = getExercisesByDay(day);
      console.log(`${getDayName(day)} (${day}): ${exercises.length} ejercicios`);
      exercises.forEach(exercise => {
        console.log(`  - ${exercise.exercises?.name}`);
      });
    });
    
    const today = getToday();
    const todayExercises = getExercisesByDay(today);
    console.log(`🎯 HOY (${getDayName(today)}): ${todayExercises.length} ejercicios`);
    console.log("=== FIN DISTRIBUCIÓN ===");
  };

  // SOLUCIÓN: Obtener ejercicios filtrados por día seleccionado SIN DUPLICADOS
  const getExercisesByDay = (day: string) => {
    if (!currentRoutine?.routine_exercises) return [];
    
    // SOLUCIÓN: Eliminar duplicados por exercise_id usando Map
    const exerciseMap = new Map();
    
    currentRoutine.routine_exercises.forEach((exercise: any) => {
      if (!exerciseMap.has(exercise.exercise_id)) {
        exerciseMap.set(exercise.exercise_id, exercise);
      }
    });

    const uniqueExercises = Array.from(exerciseMap.values());
    
    const filteredExercises = uniqueExercises.filter((exercise: any) => {
      const exerciseDay = exercise.day_of_week || 'general';
      return exerciseDay === day;
    });
    
    return filteredExercises;
  };

  // Función para debuggear duplicados
  const debugDuplicates = () => {
    if (!currentRoutine?.routine_exercises) return;
    
    console.log("=== DEBUG DUPLICADOS ===");
    
    const exerciseCounts: {[key: string]: string[]} = {};
    currentRoutine.routine_exercises.forEach((exercise: any) => {
      const name = exercise.exercises?.name;
      if (!exerciseCounts[name]) {
        exerciseCounts[name] = [];
      }
      exerciseCounts[name].push(exercise.id);
    });
    
    Object.keys(exerciseCounts).forEach(name => {
      if (exerciseCounts[name].length > 1) {
        console.log(`❌ DUPLICADO: ${name} - ${exerciseCounts[name].length} veces`);
        console.log(`   IDs: ${exerciseCounts[name].join(', ')}`);
      }
    });
    
    console.log("=== FIN DEBUG DUPLICADOS ===");
  };

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

const loadAllData = async () => {
  setLoading(true);
  try {
    await Promise.all([
      loadClientData(),
      loadMeasurements(),
      loadRoutines(),
      loadTrainers(),
      loadEvaluationRequests(),
      loadAds(),
    ]);
    
    // ✅ Debug: Verificar si los entrenadores se cargaron
    console.log("✅ Datos cargados. Entrenadores:", trainers.length);
  } catch (error) {
    console.error("Error loading data:", error);
    Alert.alert("Error", "No se pudieron cargar los datos");
  } finally {
    setLoading(false);
  }
};
const loadClientData = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  try {
    // Verificar si el usuario es cliente
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (profile?.role !== 'client') {
      console.log("⚠️ Usuario no es cliente, es:", profile?.role);
      return; // No cargar datos de cliente si no es cliente
    }

    console.log("🔍 Obteniendo client_id para usuario:", user.id);
    
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, trainer_id, membership_type, branch_id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (clientError) {
      console.error("❌ Error cargando cliente:", clientError);
      return;
    }

    if (!client) {
      console.log("⚠️ No se encontró cliente para este usuario");
      return;
    }

    console.log("✅ Client ID encontrado:", client.id);

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const { data: branchData, error: branchError } = await supabase
      .from("branches")
      .select("*")
      .eq("id", client.branch_id)
      .maybeSingle();

    const { data: trainerData, error: trainerError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", client.trainer_id)
      .maybeSingle();

    if (profileError) console.error("Error perfil:", profileError);
    if (branchError) console.error("Error sede:", branchError);
    if (trainerError) console.error("Error entrenador:", trainerError);

    const combinedData = {
      ...client,
      profiles: profileData,
      branches: branchData,
      trainers: trainerData,
    };

    setClientData(combinedData);
  } catch (error) {
    console.error("❌ Error en loadClientData:", error);
  }
};

const loadMeasurements = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  try {
    // Verificar si el usuario es cliente
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (profile?.role !== 'client') {
      return; // No cargar mediciones si no es cliente
    }

    console.log("🔍 Obteniendo client_id para medidas:", user.id);
    
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (clientError) {
      console.error("❌ Error obteniendo client_id:", clientError);
      return;
    }

    if (!client) {
      console.log("ℹ️ No se encontró cliente para este usuario");
      return;
    }

    console.log("✅ Client ID encontrado para medidas:", client.id);

    const { data, error } = await supabase
      .from("body_measurements")
      .select(
        `
        *,
        trainers:trainer_id (*)
      `
      )
      .eq("client_id", client.id)
      .order("measurement_date", { ascending: false });

    if (error) {
      console.error("❌ Error cargando medidas:", error);
      return;
    }

    setMeasurements(data || []);
  } catch (error) {
    console.error("❌ Error en loadMeasurements:", error);
  }
};

const loadRoutines = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  try {
    // ✅ AÑADIR: Verificar si el usuario es cliente
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (profile?.role !== 'client') {
      console.log("⚠️ Usuario no es cliente, omitiendo carga de rutinas");
      return; // No cargar rutinas si no es cliente
    }

    console.log("🔍 Obteniendo client_id para rutinas:", user.id);
    
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (clientError || !client) {
      console.error("❌ Error obteniendo client_id para rutinas:", clientError);
      return;
    }

    console.log("✅ Client ID encontrado para rutinas:", client.id);

    const { data: routinesData, error } = await supabase
      .from("routines")
      .select(
        `
        *,
        trainers:trainer_id (*),
        routine_exercises (
          *,
          exercises (*)
        )
      `
      )
      .eq("client_id", client.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error cargando rutinas:", error);
      return;
    }

    // SOLUCIÓN: Solo cargar ejercicios desde template si no hay routine_exercises
    const routinesWithExercises = await Promise.all(
      (routinesData || []).map(async (routine) => {
        // Si ya tiene ejercicios, usarlos directamente pero eliminar duplicados
        if (routine.routine_exercises && routine.routine_exercises.length > 0) {
          // SOLUCIÓN: Eliminar duplicados inmediatamente
          const exerciseMap = new Map();
          routine.routine_exercises.forEach((exercise: any) => {
            if (!exerciseMap.has(exercise.exercise_id)) {
              exerciseMap.set(exercise.exercise_id, exercise);
            }
          });
          
          const uniqueExercises = Array.from(exerciseMap.values());
          
          if (uniqueExercises.length !== routine.routine_exercises.length) {
            console.log(`🔄 Eliminados ${routine.routine_exercises.length - uniqueExercises.length} duplicados`);
          }
          
          return {
            ...routine,
            routine_exercises: uniqueExercises,
          };
        }
        
        // Si no tiene ejercicios, cargar desde template
        const { data: templateExercises, error: templateError } = await supabase
          .from("routine_exercises")
          .select(
            `
            *,
            exercises (*)
          `
          )
          .eq("template_id", routine.template_id);

        if (!templateError && templateExercises) {
          // SOLUCIÓN: Eliminar duplicados también del template
          const exerciseMap = new Map();
          templateExercises.forEach((exercise: any) => {
            if (!exerciseMap.has(exercise.exercise_id)) {
              exerciseMap.set(exercise.exercise_id, exercise);
            }
          });
          
          const uniqueExercises = Array.from(exerciseMap.values());
          
          return {
            ...routine,
            routine_exercises: uniqueExercises,
          };
        }
        
        return routine;
      })
    );

    setRoutines(routinesWithExercises);

    if (routinesWithExercises && routinesWithExercises.length > 0) {
      setCurrentRoutine(routinesWithExercises[0]);
      // Debuggear duplicados después de cargar
      setTimeout(debugDuplicates, 1000);
    }
  } catch (error) {
    console.error("❌ Error en loadRoutines:", error);
  }
};
const loadTrainers = async () => {
  setLoadingTrainers(true);
  try {
    console.log("🏋️ Cargando entrenadores...");
    
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("role", "trainer")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("❌ Error cargando entrenadores:", error);
      setTrainers([]);
      return;
    }

    console.log("✅ Entrenadores cargados:", data?.length || 0);
    
    // ✅ Asegurar que todos los entrenadores tengan la estructura correcta
    const formattedTrainers = (data || []).map(trainer => ({
      ...trainer,
      full_name: trainer.full_name || "Entrenador sin nombre",
      email: trainer.email || "Sin email",
      // ✅ Añadir un status simulado para compatibilidad
      status: "active"
    }));
    
    setTrainers(formattedTrainers);
    
    // ✅ DEBUG: Mostrar los entrenadores cargados
    console.log("DEBUG - Lista de entrenadores:", formattedTrainers);
  } catch (error) {
    console.error("❌ Error en loadTrainers:", error);
    setTrainers([]);
  } finally {
    setLoadingTrainers(false);
  }
};


const loadEvaluationRequests = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    console.log("🔍 Cargando solicitudes para cliente:", user.id);
    
    // Primero obtener el client_id del usuario
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (clientError) {
      console.error("❌ Error obteniendo cliente:", clientError);
      return;
    }

    if (!client) {
      console.log("⚠️ Usuario no es cliente");
      setEvaluationRequests([]);
      return;
    }

    console.log("✅ Cliente encontrado:", client.id);

    // Cargar solicitudes de evaluación para este cliente
    const { data, error } = await supabase
      .from("evaluation_requests")
      .select(`
        *,
        current_trainer:current_trainer_id (
          id,
          full_name,
          email
        )
      `)
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error cargando solicitudes:", error);
      setEvaluationRequests([]);
      return;
    }

    setEvaluationRequests(data || []);
    
  } catch (error) {
    console.error("❌ Error en loadEvaluationRequests:", error);
    setEvaluationRequests([]);
  }
};
  const loadAds = async () => {
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAds(data);
    }
  };

const canRequestEvaluation = () => {
  if (evaluationRequests.length === 0) return true;

  // Filtrar solo solicitudes de evaluación (no cambios de entrenador)
  const evaluationReqs = evaluationRequests.filter(
    req => req.purpose === "evaluation"
  );
  
  if (evaluationReqs.length === 0) return true;

  const lastRequest = evaluationReqs[0];
  const lastRequestDate = new Date(lastRequest.request_date);
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  return lastRequestDate < twoMonthsAgo || lastRequest.status === "rejected";
};

const requestEvaluation = async () => {
  if (!selectedTrainer) {
    Alert.alert("Error", "Selecciona un entrenador");
    return;
  }

  if (!canRequestEvaluation()) {
    Alert.alert("Error", "Debes esperar 2 meses desde tu última evaluación");
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, trainer_id")
    .eq("user_id", user.id)
    .single();

  if (clientError || !client) {
    Alert.alert("Error", "No se pudo encontrar tu información de cliente");
    return;
  }

  // ✅ IMPORTANTE: Usamos solo current_trainer_id (el entrenador seleccionado)
  const { error } = await supabase.from("evaluation_requests").insert([
    {
      client_id: client.id,
      current_trainer_id: selectedTrainer, // ✅ El entrenador que evaluará
      purpose: "evaluation", // ✅ Propósito específico
      status: "pending",
      request_date: new Date().toISOString(),
      preferred_time: preferredTime || null, // ✅ Hora preferida si la especificó
      notes: evaluationNotes || null, // ✅ Notas adicionales
    },
  ]);

  if (error) {
    Alert.alert("Error", error.message);
  } else {
    Alert.alert("✅ Éxito", "Solicitud de evaluación enviada. El entrenador te contactará para programarla.");
    setRequestModalVisible(false);
    setSelectedTrainer("");
    setPreferredTime("");
    setEvaluationNotes("");
    loadEvaluationRequests();
  }
};

  const showMeasurementDetails = (measurement: any) => {
    setSelectedMeasurement(measurement);
    setMeasurementDetailModalVisible(true);
  };

  const startExercise = () => {
    if (!selectedDay) {
      Alert.alert(
        "Selecciona un día",
        "Por favor selecciona un día para comenzar tu rutina"
      );
      return;
    }

    const dayExercises = getExercisesByDay(selectedDay);
    if (dayExercises.length === 0) {
      Alert.alert(
        "Sin ejercicios",
        `No hay ejercicios programados para ${getDayName(selectedDay)}`
      );
      return;
    }

    setIsRoutineStarted(true);
    setIsExerciseActive(true);
    setIsRestActive(false);
    setCurrentSet(1);
    setCurrentExerciseIndex(0);
    exerciseProgress.setValue(0);
  };

  const startRestTimer = () => {
    const dayExercises = getExercisesByDay(selectedDay);
    const currentExercise = dayExercises[currentExerciseIndex];

    if (!currentExercise) return;

    setIsRestActive(true);
    setIsExerciseActive(false);
    setRestTimer(currentExercise.rest_time || 60);

    exerciseProgress.setValue(0);

    const interval = setInterval(() => {
      setRestTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsRestActive(false);
          nextSetOrExercise();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const nextSetOrExercise = () => {
    const dayExercises = getExercisesByDay(selectedDay);
    const currentExercise = dayExercises[currentExerciseIndex];

    if (currentSet < (currentExercise?.sets || 3)) {
      setCurrentSet(currentSet + 1);
      setIsExerciseActive(true);
      setIsRestActive(false);
    } else {
      if (currentExerciseIndex < dayExercises.length - 1) {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
        setCurrentSet(1);
        setIsExerciseActive(true);
        setIsRestActive(false);
      } else {
        Alert.alert(
          "🎉 ¡Felicidades!",
          `Has completado tu rutina del ${getDayName(selectedDay)}`
        );
        setCurrentExerciseIndex(0);
        setCurrentSet(1);
        setIsRoutineStarted(false);
        setIsExerciseActive(false);
        setIsRestActive(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  // Renderizar selector de días profesional
  const renderDaySelector = () => (
    <View style={styles.daySelectorContainer}>
      <Text style={styles.daySelectorTitle}>
        SELECCIONA TU DÍA DE ENTRENAMIENTO
      </Text>
      <View style={styles.daysGrid}>
        {daysOfWeek.map((day) => {
          const dayExercises = getExercisesByDay(day.key);
          const hasExercises = dayExercises.length > 0;
          const isSelected = selectedDay === day.key;
          const isToday = getToday() === day.key;

          return (
            <TouchableOpacity
              key={day.key}
              style={[
                styles.dayButton,
                isSelected && styles.dayButtonSelected,
                !hasExercises && styles.dayButtonDisabled,
              ]}
              onPress={() => hasExercises && setSelectedDay(day.key)}
              disabled={!hasExercises}
            >
              <LinearGradient
                colors={
                  isSelected
                    ? ["#FFD700", "#FFA000"]
                    : hasExercises
                    ? ["#2a2a2a", "#1a1a1a"]
                    : ["#333", "#222"]
                }
                style={styles.dayButtonGradient}
              >
                <Text
                  style={[
                    styles.dayButtonShort,
                    isSelected && styles.dayButtonTextSelected,
                    !hasExercises && styles.dayButtonTextDisabled,
                  ]}
                >
                  {day.short}
                </Text>
                <Text
                  style={[
                    styles.dayButtonLabel,
                    isSelected && styles.dayButtonTextSelected,
                    !hasExercises && styles.dayButtonTextDisabled,
                  ]}
                >
                  {day.label}
                </Text>
                {hasExercises && (
                  <View
                    style={[
                      styles.exerciseCountBadge,
                      isSelected && styles.exerciseCountBadgeSelected,
                    ]}
                  >
                    <Text style={styles.exerciseCountText}>
                      {dayExercises.length}
                    </Text>
                  </View>
                )}
                {isToday && (
                  <View style={styles.todayIndicator}>
                    <Text style={styles.todayIndicatorText}>HOY</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedDay && (
        <View style={styles.selectedDayInfo}>
          <Text style={styles.selectedDayTitle}>
            Rutina para {getDayName(selectedDay)}
          </Text>
          <Text style={styles.exerciseCount}>
            {getExercisesByDay(selectedDay).length} ejercicios programados
          </Text>
        </View>
      )}
    </View>
  );

  // Renderizar ejercicios del día seleccionado
  const renderDayExercises = () => {
    const dayExercises = getExercisesByDay(selectedDay);

    if (dayExercises.length === 0) {
      return (
        <View style={styles.noExercises}>
          <Ionicons name="calendar-outline" size={60} color="#666" />
          <Text style={styles.noExercisesText}>
            No hay ejercicios programados para {getDayName(selectedDay)}
          </Text>
          <Text style={styles.noExercisesSubtitle}>
            Consulta con tu entrenador para agregar ejercicios a este día
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.exercisesList}>
        <Text style={styles.exercisesListTitle}>
          EJERCICIOS DE {getDayName(selectedDay).toUpperCase()} ({dayExercises.length})
        </Text>
        {dayExercises.map((exercise: any, index: number) => (
          <View
            key={exercise.id}
            style={[
              styles.exerciseItem,
              index === currentExerciseIndex && styles.currentExercise,
            ]}
          >
            <LinearGradient
              colors={["#2a2a2a", "#1a1a1a"]}
              style={styles.exerciseItemGradient}
            >
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseNumber}>
                  <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>
                    {exercise.exercises?.name || "Ejercicio no disponible"}
                  </Text>
                  <Text style={styles.exerciseSets}>
                    {exercise.sets} series × {exercise.reps} repeticiones
                  </Text>
                </View>
                {exercise.exercises?.video_url && (
                  <Ionicons name="videocam" size={20} color="#FFD700" />
                )}
              </View>

              <View style={styles.exerciseDetails}>
                <View style={styles.exerciseDetailItem}>
                  <Ionicons name="time-outline" size={14} color="#FFD700" />
                  <Text style={styles.exerciseDetailText}>
                    Descanso: {exercise.rest_time}s
                  </Text>
                </View>

                {exercise.exercises?.video_url && (
                  <TouchableOpacity
                    style={styles.videoPreview}
                    onPress={() => {
                      Alert.alert(
                        "🎥 Demostración",
                        `Video demostrativo: ${exercise.exercises?.name}`,
                        [{ text: "OK" }]
                      );
                    }}
                  >
                    <Ionicons name="play-circle" size={16} color="#FFD700" />
                    <Text style={styles.videoPreviewText}>
                      Ver demostración
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {index === currentExerciseIndex && isRoutineStarted && (
                <View style={styles.currentExerciseIndicator}>
                  <Ionicons name="play" size={16} color="#FFD700" />
                  <Text style={styles.currentExerciseIndicatorText}>
                    PRÓXIMO EJERCICIO
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>
        ))}
      </View>
    );
  };

  // MEJORADO: Función para mostrar ejercicios de hoy con mejor detección
  const renderTodaysExercises = () => {
    if (
      !currentRoutine?.routine_exercises ||
      currentRoutine.routine_exercises.length === 0
    ) {
      return (
        <View style={styles.noExercises}>
          <Text style={styles.noExercisesText}>
            No hay ejercicios asignados para esta rutina
          </Text>
        </View>
      );
    }

    // Obtener el día actual
    const today = getToday();
    const todayExercises = getExercisesByDay(today);

    console.log(`🎯 RENDER HOY: ${today} (${getDayName(today)}) - ${todayExercises.length} ejercicios`);

    if (todayExercises.length === 0) {
      return (
        <View style={styles.noExercises}>
          <Ionicons name="fitness-outline" size={30} color="#666" />
          <Text style={styles.noExercisesText}>
            No hay ejercicios programados para hoy ({getDayName(today)})
          </Text>
          <Text style={styles.noExercisesSubtitle}>
            Descansa o consulta con tu entrenador
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.todaysExercises}>
        <Text style={styles.todaysExercisesTitle}>
          Ejercicios de Hoy ({todayExercises.length})
        </Text>
        {todayExercises.slice(0, 3).map((exercise: any, index: number) => (
          <View key={exercise.id} style={styles.exercisePreview}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>
                {index + 1}.{" "}
                {exercise.exercises?.name || "Ejercicio no disponible"}
              </Text>
              {exercise.exercises?.video_url && (
                <Ionicons name="videocam" size={16} color="#FFD700" />
              )}
            </View>
            <Text style={styles.exerciseSets}>
              {exercise.sets}×{exercise.reps} - {exercise.rest_time}s descanso
            </Text>
          </View>
        ))}
        {todayExercises.length > 3 && (
          <Text style={styles.moreExercisesText}>
            +{todayExercises.length - 3} ejercicios más...
          </Text>
        )}
      </View>
    );
  };

  const renderHomeTab = () => (
    <View style={styles.tabContent}>
      {ads.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.adsContainer}
        >
          {ads.map((ad) => (
            <View key={ad.id} style={styles.adCard}>
              {ad.image_url && (
                <Image source={{ uri: ad.image_url }} style={styles.adImage} />
              )}
              <Text style={styles.adTitle}>{ad.title}</Text>
              <Text style={styles.adDescription}>{ad.description}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {measurements.length > 0 && (
        <View style={styles.metricsSummary}>
          <Text style={styles.sectionTitle}>TUS MÉTRICAS ACTUALES</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {measurements[0].bmi || "N/A"}
              </Text>
              <Text style={styles.metricLabel}>IMC</Text>
              <Text style={styles.metricCategory}>
                {BodyMetricsCalculator.getBMICategory(measurements[0].bmi)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {measurements[0].body_fat || "N/A"}%
              </Text>
              <Text style={styles.metricLabel}>GRASA</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {measurements[0].metabolic_age || "N/A"}
              </Text>
              <Text style={styles.metricLabel}>EDAD METABÓLICA</Text>
            </View>
          </View>
        </View>
      )}

      {currentRoutine ? (
        <View style={styles.todaysRoutine}>
          <Text style={styles.sectionTitle}>RUTINA ACTIVA</Text>
          <View style={styles.routineOverview}>
            <Text style={styles.routineName}>{currentRoutine.name}</Text>

            {currentRoutine.description &&
              currentRoutine.description !== currentRoutine.name && (
                <Text style={styles.routineDescription}>
                  {currentRoutine.description}
                </Text>
              )}

            {currentRoutine.trainers && (
              <Text style={styles.trainerInfo}>
                Entrenador: {currentRoutine.trainers.full_name || "No asignado"}
              </Text>
            )}

            {/* Mostrar ejercicios de hoy o mensaje de descanso */}
            {renderTodaysExercises()}

            <TouchableOpacity
              style={styles.startRoutineButton}
              onPress={() => setActiveTab("routines")}
            >
              <LinearGradient
                colors={["#FFD700", "#FFA000"]}
                style={styles.startRoutineButtonGradient}
              >
                <Text style={styles.startRoutineText}>VER RUTINA COMPLETA</Text>
                <Ionicons name="arrow-forward" size={20} color="#000" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={50} color="#666" />
          <Text style={styles.emptyStateText}>No tienes rutinas asignadas</Text>
          <Text style={styles.emptyStateSubtitle}>
            Contacta a tu entrenador para obtener una rutina
          </Text>
        </View>
      )}

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => setRequestModalVisible(true)}
        >
          <Ionicons name="clipboard-outline" size={24} color="#FFD700" />
          <Text style={styles.quickActionText}>Solicitar Evaluación</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => setActiveTab("measurements")}
        >
          <Ionicons name="stats-chart-outline" size={24} color="#FFD700" />
          <Text style={styles.quickActionText}>Ver Métricas</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProfileTab = () => (
    <View style={styles.tabContent}>
      {clientData && (
        <View style={styles.profileCard}>
          <LinearGradient
            colors={["#1a1a1a", "#2a2a2a"]}
            style={styles.profileGradient}
          >
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Ionicons
                  name="person-circle-outline"
                  size={80}
                  color="#FFD700"
                />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {clientData.profiles?.full_name || "Nombre no disponible"}
                </Text>
                <Text style={styles.profileEmail}>
                  {clientData.profiles?.email || "Email no disponible"}
                </Text>
              </View>
            </View>

            <View style={styles.profileDetails}>
              <View style={styles.profileDetailItem}>
                <Ionicons name="business-outline" size={16} color="#FFD700" />
                <Text style={styles.profileDetailText}>
                  Sede: {clientData.branches?.name || "No asignada"}
                </Text>
              </View>

              <View style={styles.profileDetailItem}>
                <Ionicons name="fitness-outline" size={16} color="#FFD700" />
                <Text style={styles.profileDetailText}>
                  Entrenador: {clientData.trainers?.full_name || "No asignado"}
                </Text>
              </View>

              <View style={styles.profileDetailItem}>
                <Ionicons name="card-outline" size={16} color="#FFD700" />
                <Text style={styles.profileDetailText}>
                  Membresía: {clientData.membership_type || "No asignada"}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.profileStatus,
                clientData.status === "active"
                  ? styles.activeStatus
                  : styles.inactiveStatus,
              ]}
            >
              <Text style={styles.statusText}>
                {clientData.status === "active" ? "✅ Activo" : "❌ Inactivo"}
              </Text>
            </View>
          </LinearGradient>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.requestButton,
          !canRequestEvaluation() && styles.disabledButton,
        ]}
        onPress={() => setRequestModalVisible(true)}
        disabled={!canRequestEvaluation()}
      >
        <LinearGradient
          colors={["#FFD700", "#FFA000"]}
          style={styles.requestButtonGradient}
        >
          <Ionicons name="add-circle-outline" size={20} color="#000" />
          <Text style={styles.requestButtonText}>
            {canRequestEvaluation()
              ? "Solicitar Evaluación"
              : "Espera 2 meses para nueva evaluación"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderMeasurementsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Historial de Medidas Corporales</Text>

      {measurements.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="stats-chart-outline" size={50} color="#666" />
          <Text style={styles.emptyStateText}>
            No hay mediciones registradas
          </Text>
          <Text style={styles.emptyStateSubtitle}>
            Solicita una evaluación para obtener tus medidas
          </Text>
        </View>
      ) : (
        measurements.map((measurement) => (
          <View key={measurement.id} style={styles.measurementCard}>
            <LinearGradient
              colors={["#1a1a1a", "#2a2a2a"]}
              style={styles.measurementGradient}
            >
              <View style={styles.measurementHeader}>
                <Text style={styles.measurementDate}>
                  {new Date(measurement.measurement_date).toLocaleDateString(
                    "es-ES",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </Text>
                <Text style={styles.measurementTrainer}>
                  Por:{" "}
                  {measurement.trainers?.full_name ||
                    "Entrenador no disponible"}
                </Text>
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>
                    {measurement.bmi || "N/A"}
                  </Text>
                  <Text style={styles.metricLabel}>IMC</Text>
                  <Text style={styles.metricCategory}>
                    {BodyMetricsCalculator.getBMICategory(measurement.bmi)}
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>
                    {measurement.body_fat || "N/A"}%
                  </Text>
                  <Text style={styles.metricLabel}>Grasa</Text>
                  <Text style={styles.metricCategory}>
                    {BodyMetricsCalculator.getBodyFatCategory(
                      measurement.body_fat,
                      measurement.gender
                    )}
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>
                    {measurement.metabolic_age || "N/A"}
                  </Text>
                  <Text style={styles.metricLabel}>Edad Metabólica</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => showMeasurementDetails(measurement)}
              >
                <Text style={styles.detailsButtonText}>
                  Ver Detalles Completos
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#000" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ))
      )}
    </View>
  );

const renderRequestsTab = () => {
  // Filtrar solo solicitudes de evaluación
  const evaluationRequestsFiltered = evaluationRequests.filter(
    req => req.purpose === "evaluation"
  );

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Mis Evaluaciones</Text>
      
      {evaluationRequestsFiltered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={50} color="#666" />
          <Text style={styles.emptyStateText}>No hay evaluaciones</Text>
          <Text style={styles.emptyStateSubtitle}>
            Puedes solicitar una evaluación cada 2 meses
          </Text>
        </View>
      ) : (
        evaluationRequestsFiltered.map((request) => {
          const trainerName = request.current_trainer?.full_name || "Entrenador no asignado";
          const requestDate = new Date(request.request_date).toLocaleDateString("es-ES", {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          
          // ❗ IMPORTANTE: Manejar el estado "accepted" como "programada"
          let statusColor = "#FFD700";
          let statusText = "⏳ Pendiente";
          
          if (request.status === "accepted" || request.status === "scheduled") { // ✅ CAMBIADO
            statusColor = "#4CAF50";
            statusText = "✅ Programada";
          } else if (request.status === "completed") {
            statusColor = "#007AFF";
            statusText = "✓ Completada";
          } else if (request.status === "rejected") {
            statusColor = "#FF4444";
            statusText = "❌ Rechazada";
          }

          // Extraer fecha y hora programada si existe
          let scheduledDate = null;
          let scheduledTime = null;
          
          if (request.scheduled_date) {
            try {
              const dateObj = new Date(request.scheduled_date);
              scheduledDate = dateObj.toLocaleDateString("es-ES", {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
              scheduledTime = dateObj.toLocaleTimeString("es-ES", {
                hour: '2-digit',
                minute: '2-digit'
              });
            } catch (error) {
              console.error("Error parsing date:", error);
            }
          }

          return (
            <View key={request.id} style={styles.evaluationCard}>
              <LinearGradient
                colors={["#1a1a1a", "#2a2a2a"]}
                style={styles.evaluationGradient}
              >
                {/* CABECERA */}
                <View style={styles.evaluationHeader}>
                  <View style={styles.trainerInfo}>
                    <Ionicons name="person-circle" size={24} color="#FFD700" />
                    <Text style={styles.trainerName}>{trainerName}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                    <Text style={styles.statusBadgeText}>{statusText}</Text>
                  </View>
                </View>

                {/* FECHA DE SOLICITUD */}
                <View style={styles.evaluationDateRow}>
                  <Ionicons name="calendar-outline" size={16} color="#FFD700" />
                  <Text style={styles.evaluationDateText}>Solicitado: {requestDate}</Text>
                </View>

                {/* ✅ NUEVO: INFORMACIÓN DE PROGRAMACIÓN CUANDO ESTÁ ACEPTADA */}
                {(request.status === "accepted" || request.status === "scheduled") && request.scheduled_date && (
                  <View style={styles.scheduledInfo}>
                    <View style={styles.scheduledHeader}>
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      <Text style={styles.scheduledTitle}>Evaluación Programada</Text>
                    </View>
                    <View style={styles.scheduledDetails}>
                      <Text style={styles.scheduledDetail}>
                        📅 Fecha: {scheduledDate || request.scheduled_date}
                      </Text>
                      <Text style={styles.scheduledDetail}>
                        ⏰ Hora: {scheduledTime || "Por confirmar"}
                      </Text>
                      
                      {/* ✅ MOSTRAR LAS NOTAS DEL ENTRENADOR */}
                      {request.notes && (
                        <View style={styles.trainerNotesContainer}>
                          <Text style={styles.trainerNotesLabel}>
                            📝 Notas del entrenador:
                          </Text>
                          <Text style={styles.trainerNotesText}>
                            {request.notes}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* ✅ MOSTRAR LAS NOTAS ORIGINALES DEL CLIENTE SI EXISTEN */}
                {request.preferred_time && request.status === "pending" && (
                  <View style={styles.evaluationTimeRow}>
                    <Ionicons name="time-outline" size={16} color="#4CAF50" />
                    <Text style={styles.evaluationTimeText}>
                      Hora preferida: {request.preferred_time}
                    </Text>
                  </View>
                )}

                {/* ✅ SEPARAR: MIS NOTAS (cliente) vs NOTAS DEL ENTRENADOR */}
                {request.preferred_time && (request.status === "pending" || request.status === "rejected") && (
                  <View style={styles.requestNotesContainer}>
                    <Text style={styles.requestNotesLabel}>Mis notas:</Text>
                    <Text style={styles.requestNotesText}>{request.preferred_time}</Text>
                  </View>
                )}

                {/* RAZÓN DE RECHAZO */}
                {request.status === "rejected" && request.reason && (
                  <View style={styles.rejectionContainer}>
                    <Ionicons name="alert-circle" size={16} color="#FF4444" />
                    <Text style={styles.rejectionText}>
                      Razón: {request.reason}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </View>
          );
        })
      )}
    </View>
  );
};


  const renderMeasurementDetailModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={measurementDetailModalVisible}
      onRequestClose={() => setMeasurementDetailModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <LinearGradient
          colors={["#1a1a1a", "#000000"]}
          style={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalles Completos de Medidas</Text>
            <TouchableOpacity
              onPress={() => setMeasurementDetailModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#FFD700" />
            </TouchableOpacity>
          </View>

          {selectedMeasurement && (
            <ScrollView style={styles.detailContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>
                  📊 Información General
                </Text>
                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Fecha:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(
                        selectedMeasurement.measurement_date
                      ).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Edad:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.age} años
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Género:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.gender === "male"
                        ? "Hombre"
                        : "Mujer"}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Altura:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.height} cm
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Peso:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.weight} kg
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>
                  📈 Composición Corporal
                </Text>
                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>IMC:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.bmi}
                    </Text>
                    <Text style={styles.detailCategory}>
                      {BodyMetricsCalculator.getBMICategory(
                        selectedMeasurement.bmi
                      )}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>% Grasa Corporal:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.body_fat}%
                    </Text>
                    <Text style={styles.detailCategory}>
                      {BodyMetricsCalculator.getBodyFatCategory(
                        selectedMeasurement.body_fat,
                        selectedMeasurement.gender
                      )}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Masa Muscular:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.muscle_mass} kg
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Edad Metabólica:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.metabolic_age} años
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>% Agua:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.water_percentage}%
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Masa Ósea:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.bone_mass} kg
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Grasa Visceral:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.visceral_fat}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>
                  📐 Circunferencias (cm)
                </Text>
                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Cuello:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.neck} cm
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Hombros:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.shoulders} cm
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Pecho:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.chest} cm
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Brazos:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.arms} cm
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Cintura:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.waist} cm
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Glúteos:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.glutes} cm
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Piernas:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.legs} cm
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Pantorrillas:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMeasurement.calves} cm
                    </Text>
                  </View>
                </View>
              </View>

              {selectedMeasurement.injuries &&
                selectedMeasurement.injuries !== "Ninguna" && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>
                      ⚠️ Lesiones/Consideraciones
                    </Text>
                    <Text style={styles.injuriesText}>
                      {selectedMeasurement.injuries}
                    </Text>
                  </View>
                )}

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>👨‍💼 Entrenador</Text>
                <Text style={styles.trainerText}>
                  {selectedMeasurement.trainers?.full_name ||
                    "Entrenador no disponible"}
                </Text>
              </View>
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.closeDetailButton}
            onPress={() => setMeasurementDetailModalVisible(false)}
          >
            <Text style={styles.closeDetailButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );

  


  const renderRoutinesTab = () => (
    <View style={styles.tabContent}>
      {currentRoutine ? (
        <View style={styles.activeRoutine}>
          <Text style={styles.sectionTitle}>RUTINA ACTIVA</Text>

          {!isRoutineStarted ? (
            <View style={styles.routineOverview}>
              <LinearGradient
                colors={["#1a1a1a", "#2a2a2a"]}
                style={styles.routineGradient}
              >
                <Text style={styles.routineName}>{currentRoutine.name}</Text>
                <Text style={styles.routineDescription}>
                  {currentRoutine.description}
                </Text>

                {/* Selector de días profesional */}
                {renderDaySelector()}

                {/* Ejercicios del día seleccionado */}
                {selectedDay && renderDayExercises()}

                <TouchableOpacity
                  style={styles.startButton}
                  onPress={startExercise}
                  disabled={
                    !selectedDay || getExercisesByDay(selectedDay).length === 0
                  }
                >
                  <LinearGradient
                    colors={["#FFD700", "#FFA000"]}
                    style={[
                      styles.startButtonGradient,
                      (!selectedDay ||
                        getExercisesByDay(selectedDay).length === 0) &&
                        styles.disabledButton,
                    ]}
                  >
                    <Text style={styles.startButtonText}>
                      {selectedDay
                        ? `COMENZAR RUTINA - ${getDayName(
                            selectedDay
                          ).toUpperCase()}`
                        : "SELECCIONA UN DÍA"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ) : isRestActive ? (
            <View style={styles.exerciseSession}>
              <LinearGradient
                colors={["#1a1a1a", "#2a2a2a"]}
                style={styles.sessionGradient}
              >
                <Text style={styles.sessionTitle}>TIEMPO DE DESCANSO</Text>

                {currentRoutine.routine_exercises[currentExerciseIndex]
                  ?.exercises?.video_url && (
                  <View style={styles.videoContainer}>
                    <WebView
                      source={{
                        uri: currentRoutine.routine_exercises[
                          currentExerciseIndex
                        ].exercises.video_url,
                      }}
                      style={styles.video}
                      allowsFullscreenVideo={true}
                      javaScriptEnabled={true}
                      domStorageEnabled={true}
                      startInLoadingState={true}
                    />
                  </View>
                )}

                <Text style={styles.exerciseName}>
                  {
                    currentRoutine.routine_exercises[currentExerciseIndex]
                      ?.exercises?.name
                  }
                </Text>

                <Text style={styles.setInfo}>
                  Set {currentSet} de{" "}
                  {currentRoutine.routine_exercises[currentExerciseIndex]?.sets}
                </Text>

                <Text style={styles.timer}>{formatTime(restTimer)}</Text>

                <Text style={styles.sessionInfo}>
                  {currentRoutine.routine_exercises[currentExerciseIndex]?.reps}{" "}
                  repeticiones
                </Text>

                <View style={styles.sessionControls}>
                  <TouchableOpacity
                    style={styles.pauseButton}
                    onPress={() => {
                      Alert.alert("⏸️", "Funcionalidad de pausa en desarrollo");
                    }}
                  >
                    <Text style={styles.pauseButtonText}>Pausar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.skipButton}
                    onPress={() => {
                      setIsRestActive(false);
                      nextSetOrExercise();
                    }}
                  >
                    <Text style={styles.skipButtonText}>Saltar</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.exerciseSession}>
              <LinearGradient
                colors={["#1a1a1a", "#2a2a2a"]}
                style={styles.sessionGradient}
              >
                <Text style={styles.sessionTitle}>EJERCICIO ACTUAL</Text>

                {currentRoutine.routine_exercises[currentExerciseIndex]
                  ?.exercises?.video_url && (
                  <View style={styles.videoContainer}>
                    <WebView
                      source={{
                        uri: currentRoutine.routine_exercises[
                          currentExerciseIndex
                        ].exercises.video_url,
                      }}
                      style={styles.video}
                      allowsFullscreenVideo={true}
                      javaScriptEnabled={true}
                      domStorageEnabled={true}
                      startInLoadingState={true}
                    />
                  </View>
                )}

                <Text style={styles.exerciseName}>
                  {
                    currentRoutine.routine_exercises[currentExerciseIndex]
                      ?.exercises?.name
                  }
                </Text>

                <Text style={styles.setInfo}>
                  Set {currentSet} de{" "}
                  {currentRoutine.routine_exercises[currentExerciseIndex]?.sets}
                </Text>

                <Text style={styles.sessionInfo}>
                  {currentRoutine.routine_exercises[currentExerciseIndex]?.reps}{" "}
                  repeticiones
                </Text>

                <Text style={styles.restInfo}>
                  Descanso:{" "}
                  {
                    currentRoutine.routine_exercises[currentExerciseIndex]
                      ?.rest_time
                  }
                  s
                </Text>

                <View style={styles.exerciseControls}>
                  <TouchableOpacity
                    style={styles.startRestButton}
                    onPress={startRestTimer}
                  >
                    <LinearGradient
                      colors={["#FFD700", "#FFA000"]}
                      style={styles.startRestButtonGradient}
                    >
                      <Text style={styles.startRestButtonText}>
                        INICIAR DESCANSO
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.skipExerciseButton}
                    onPress={() => {
                      nextSetOrExercise();
                    }}
                  >
                    <Text style={styles.skipExerciseButtonText}>
                      SALTAR EJERCICIO
                    </Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={50} color="#666" />
          <Text style={styles.emptyStateText}>No tienes rutinas asignadas</Text>
          <Text style={styles.emptyStateSubtitle}>
            Contacta a tu entrenador para obtener una rutina
          </Text>
        </View>
      )}

      {routines.length > 1 && (
        <>
          <Text style={styles.sectionTitle}>RUTINAS ANTERIORES</Text>
          {routines.slice(1).map((routine) => (
            <View key={routine.id} style={styles.routineCard}>
              <LinearGradient
                colors={["#1a1a1a", "#2a2a2a"]}
                style={styles.routineCardGradient}
              >
                <Text style={styles.routineName}>{routine.name}</Text>
                <Text style={styles.routineDate}>
                  {new Date(routine.start_date).toLocaleDateString()} -{" "}
                  {routine.end_date
                    ? new Date(routine.end_date).toLocaleDateString()
                    : "Presente"}
                </Text>
              </LinearGradient>
            </View>
          ))}
        </>
      )}
    </View>
  );

 

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
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

      <View style={styles.tabContainer}>
        {[
          { key: "home", label: "Inicio", icon: "home" as const },
          { key: "profile", label: "Perfil", icon: "person" as const },
          {
            key: "measurements",
            label: "Medidas",
            icon: "stats-chart" as const,
          },
          { key: "routines", label: "Rutinas", icon: "barbell" as const },
          {
            key: "requests",
            label: "Solicitudes",
            icon: "document-text" as const,
          },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? "#000" : "#999"}
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
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FFD700"]}
            tintColor="#FFD700"
          />
        }
        style={styles.content}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>Cargando datos...</Text>
          </View>
        ) : (
          <>
            {activeTab === "home" && renderHomeTab()}
            {activeTab === "profile" && renderProfileTab()}
            {activeTab === "measurements" && renderMeasurementsTab()}
            {activeTab === "routines" && renderRoutinesTab()}
            {activeTab === "requests" && renderRequestsTab()}
          </>
        )}
      </ScrollView>

<Modal
  animationType="slide"
  transparent={true}
  visible={requestModalVisible}
  onRequestClose={() => setRequestModalVisible(false)}
>
  <View style={styles.modalContainer}>
    <LinearGradient
      colors={["#1a1a1a", "#000000"]}
      style={styles.modalContent}
    >
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Solicitar Evaluación</Text>
        <TouchableOpacity onPress={() => setRequestModalVisible(false)}>
          <Ionicons name="close" size={24} color="#FFD700" />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Seleccionar Entrenador:</Text>
      
      {/* ✅ DEBUG: Verificar qué datos llegan */}
      {trainers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No hay entrenadores disponibles</Text>
        </View>
      ) : (
        <ScrollView style={styles.trainersList}>
          {trainers.map((trainer) => (
            <TouchableOpacity
              key={trainer.id}
              style={[
                styles.trainerOption,
                selectedTrainer === trainer.id && styles.selectedTrainer,
              ]}
              onPress={() => {
                console.log("DEBUG - Trainer seleccionado:", trainer);
                setSelectedTrainer(trainer.id);
              }}
            >
              <Ionicons
                name="person-circle-outline"
                size={40}
                color="#FFD700"
              />
              <View style={styles.trainerInfo}>
                <Text style={styles.trainerText}>
                  {trainer.full_name || "Entrenador sin nombre"}
                </Text>
                <Text style={styles.trainerEmail}>
                  {trainer.email || "Sin email"}
                </Text>
                {/* ✅ Eliminada la línea con status: <Text style={styles.trainerStatus}>✅ Activo</Text> */}
              </View>
              {selectedTrainer === trainer.id && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color="#FFD700"
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setRequestModalVisible(false)}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmButton, !selectedTrainer && styles.disabledButton]}
          onPress={requestEvaluation}
          disabled={!selectedTrainer}
        >
          <LinearGradient
            colors={["#FFD700", "#FFA000"]}
            style={styles.confirmButtonGradient}
          >
            <Text style={styles.confirmButtonText}>
              {selectedTrainer ? "Enviar Solicitud" : "Selecciona Entrenador"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  </View>
</Modal>

      {/* Modal para detalles de medidas */}
      {renderMeasurementDetailModal()}
    </View>
  );
}

// ESTILOS PROFESIONALES PREMIUM - MÁS DE 2400 LÍNEAS
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#FFD700",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logoContainer: {
    flex: 1,
    alignItems: "flex-start",
  },
  logo: {
    width: 200,
    height: 40,
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
    backgroundColor: "#000000",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  activeTab: {
    backgroundColor: "#FFD700",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#999",
    marginLeft: 5,
  },
  activeTabText: {
    color: "#000000",
  },
  content: {
    flex: 1,
    padding: 15,
  },
  tabContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    color: "#FFD700",
    fontSize: 16,
  },

  // Home Tab Styles
  adsContainer: {
    marginBottom: 20,
  },
  adCard: {
    width: 300,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 15,
    marginRight: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  adImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginBottom: 10,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 5,
  },
  adDescription: {
    fontSize: 14,
    color: "#ccc",
  },
  metricsSummary: {
    marginBottom: 20,
  },
  todaysRoutine: {
    marginBottom: 20,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickAction: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#333",
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFD700",
    textAlign: "center",
  },

  // Profile Tab Styles
  profileCard: {
    marginBottom: 15,
    borderRadius: 12,
    overflow: "hidden",
  },
  profileGradient: {
    padding: 20,
    borderRadius: 12,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    color: "#ccc",
  },
  profileDetails: {
    marginBottom: 15,
  },
  profileDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  profileDetailText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#ccc",
  },
  profileStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  activeStatus: {
    backgroundColor: "#1a3c1a",
  },
  inactiveStatus: {
    backgroundColor: "#3c1a1a",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFD700",
  },

  // Common Styles
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  metricCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
    flex: 1,
    marginHorizontal: 5,
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  // Measurement Tab Styles
  measurementCard: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  measurementGradient: {
    padding: 15,
    borderRadius: 12,
  },
  measurementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  measurementDate: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFD700",
  },
  measurementTrainer: {
    fontSize: 12,
    color: "#ccc",
  },
  metricItem: {
    alignItems: "center",
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFD700",
  },
  metricLabel: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 5,
  },
  metricCategory: {
    fontSize: 10,
    color: "#ccc",
    marginTop: 2,
    textAlign: "center",
  },
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD700",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  detailsButtonText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "bold",
    marginRight: 5,
  },

  // Routine Tab Styles
  activeRoutine: {
    marginBottom: 20,
  },
  exerciseSession: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 10,
  },

  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#333",
    borderRadius: 4,
    marginBottom: 20,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFD700",
    borderRadius: 4,
  },
  sessionControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  pauseButton: {
    flex: 1,
    backgroundColor: "#FFA500",
    padding: 12,
    borderRadius: 8,
    marginRight: 5,
    alignItems: "center",
  },
  pauseButtonText: {
    color: "#000000",
    fontWeight: "bold",
  },
  skipButton: {
    flex: 1,
    backgroundColor: "#666",
    padding: 12,
    borderRadius: 8,
    marginLeft: 5,
    alignItems: "center",
  },
  skipButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  routineOverview: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  routineGradient: {
    padding: 20,
    borderRadius: 12,
  },
  routineName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 5,
  },
  routineDescription: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 15,
  },
  exercisesList: {
    marginBottom: 20,
  },
  exerciseItem: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
    overflow: "hidden",
  },
  currentExercise: {
    borderLeftWidth: 4,
    borderLeftColor: "#FFD700",
  },
  exerciseSets: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFD700",
  },
  exerciseRest: {
    fontSize: 12,
    color: "#ccc",
  },
  currentExerciseText: {
    fontSize: 12,
    color: "#FFD700",
    fontWeight: "bold",
    marginTop: 5,
  },
  startButton: {
    borderRadius: 8,
    overflow: "hidden",
  },
  startButtonGradient: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  startButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
  },
  exercisePreview: {
    marginBottom: 8,
  },
  routineCard: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  routineCardGradient: {
    padding: 15,
    borderRadius: 12,
  },
  routineDate: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 5,
  },

  // Request Tab Styles
  requestCard: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  requestGradient: {
    padding: 15,
    borderRadius: 12,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  requestDate: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFD700",
  },
  requestStatus: {
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingStatus: {
    backgroundColor: "#333300",
    color: "#FFD700",
  },
  acceptedStatus: {
    backgroundColor: "#003300",
    color: "#00FF00",
  },
  rejectedStatus: {
    backgroundColor: "#330000",
    color: "#FF4444",
  },
  requestType: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 5,
  },
  requestTrainer: {
    fontSize: 12,
    color: "#ccc",
    marginBottom: 5,
  },
  requestNotes: {
    fontSize: 12,
    color: "#ccc",
    fontStyle: "italic",
    marginTop: 5,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyStateText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyStateSubtitle: {
    marginTop: 5,
    color: "#666",
    fontSize: 14,
    textAlign: "center",
  },

  // Buttons
  requestButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  requestButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  requestButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  startRoutineButton: {
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 10,
  },
  startRoutineButtonGradient: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  startRoutineText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 8,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
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
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#FFD700",
  },
  trainersList: {
    maxHeight: 200,
    marginBottom: 20,
  },
  trainerOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#2a2a2a",
  },
  selectedTrainer: {
    backgroundColor: "#333300",
    borderColor: "#FFD700",
  },

  trainerText: {
    color: "#FFD700",
    fontWeight: "bold",
  },
  trainerEmail: {
    color: "#ccc",
    fontSize: 12,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#333",
    marginRight: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#666",
  },
  cancelButtonText: {
    color: "#ccc",
    fontWeight: "bold",
  },
  confirmButton: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  confirmButtonGradient: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#000000",
    fontWeight: "bold",
  },

  // Measurement Detail Modal Styles
  detailContent: {
    maxHeight: 400,
    marginBottom: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 5,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  detailItem: {
    width: "48%",
    marginBottom: 10,
    padding: 8,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: "#ccc",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFD700",
  },
  detailCategory: {
    fontSize: 10,
    color: "#ccc",
    fontStyle: "italic",
    marginTop: 2,
  },
  injuriesText: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
    padding: 10,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
  },
  closeDetailButton: {
    backgroundColor: "#FFD700",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  closeDetailButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
  },

  todaysExercises: {
    marginTop: 10,
  },
  todaysExercisesTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 8,
  },
  noExercises: {
    padding: 10,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    marginTop: 10,
  },
  noExercisesText: {
    color: "#ccc",
    textAlign: "center",
    fontSize: 12,
  },
  moreExercisesText: {
    fontSize: 12,
    color: "#FFD700",
    textAlign: "center",
    marginTop: 5,
    fontStyle: "italic",
  },
  trainerInfo: {
    fontSize: 12,
    color: "#ccc",
    marginBottom: 10,
    fontStyle: "italic",
  },
  exerciseDetails: {
    marginTop: 5,
  },
  exerciseDay: {
    fontSize: 11,
    color: "#FFA500",
  },
  exerciseMinutes: {
    fontSize: 11,
    color: "#00BFFF",
  },
  // Video Styles
  videoContainer: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 15,
    backgroundColor: "#000",
  },
  video: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  videoPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  videoPreviewText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 5,
  },

  // Mejora los estilos existentes para mejor visualización
  sessionGradient: {
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 500, // Para asegurar espacio para el video
  },
  timer: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#FFD700",
    marginVertical: 15,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 10,
    textAlign: "center",
  },
  setInfo: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 5,
    textAlign: "center",
  },
  sessionInfo: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 20,
    textAlign: "center",
  },
  // En el objeto styles, agrega:
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  // Nuevos estilos para los controles de ejercicio
  exerciseControls: {
    width: "100%",
    marginTop: 20,
  },
  startRestButton: {
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 10,
  },
  startRestButtonGradient: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  startRestButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
  },
  skipExerciseButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#333",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#666",
  },
  skipExerciseButtonText: {
    color: "#ccc",
    fontWeight: "bold",
  },
  restInfo: {
    fontSize: 14,
    color: "#FFA500",
    marginBottom: 10,
    textAlign: "center",
  },

  // NUEVOS ESTILOS PARA EL SELECTOR DE DÍAS PROFESIONAL
  daySelectorContainer: {
    marginBottom: 20,
  },
  daySelectorTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 15,
    textAlign: "center",
    letterSpacing: 1,
  },
  daysGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  dayButton: {
    flex: 1,
    marginHorizontal: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
  dayButtonGradient: {
    padding: 12,
    alignItems: "center",
    borderRadius: 10,
    minHeight: 70,
    justifyContent: "center",
  },
  dayButtonSelected: {
    transform: [{ scale: 1.05 }],
  },
  dayButtonDisabled: {
    opacity: 0.5,
  },
  dayButtonShort: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 2,
  },
  dayButtonLabel: {
    fontSize: 10,
    color: "#ccc",
    fontWeight: "600",
  },
  dayButtonTextSelected: {
    color: "#000000",
    fontWeight: "bold",
  },
  dayButtonTextDisabled: {
    color: "#666",
  },
  exerciseCountBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "#FFD700",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseCountBadgeSelected: {
    backgroundColor: "#000000",
  },
  exerciseCountText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#000000",
  },
  todayIndicator: {
    position: "absolute",
    top: 5,
    left: 5,
    backgroundColor: "#FF4444",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  todayIndicatorText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  selectedDayInfo: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#FFD700",
  },
  selectedDayTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 5,
  },
  exerciseCount: {
    fontSize: 14,
    color: "#ccc",
    fontWeight: "600",
  },

  // Estilos mejorados para la lista de ejercicios
  exercisesListTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 15,
    textAlign: "center",
    letterSpacing: 1,
  },
  exerciseItemGradient: {
    padding: 15,
    borderRadius: 8,
  },
  exerciseNumber: {
    backgroundColor: "#FFD700",
    borderRadius: 20,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  exerciseNumberText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000000",
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  exerciseDetailText: {
    fontSize: 12,
    color: "#ccc",
    marginLeft: 6,
  },
  currentExerciseIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  currentExerciseIndicatorText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFD700",
    marginLeft: 6,
  },
  noExercisesSubtitle: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 5,
    lineHeight: 16,
  },
  // Estilos para evaluaciones
evaluationRequestCard: {
  borderRadius: 12,
  overflow: "hidden",
  marginBottom: 10,
},
evaluationHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
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
scheduleButtonText: {
  color: "#000000",
  fontSize: 12,
  fontWeight: "bold",
},
rejectButton: {
  flex: 1,
  borderRadius: 8,
  overflow: "hidden",
},
rejectButtonGradient: {
  padding: 12,
  borderRadius: 8,
  alignItems: "center",
},
rejectButtonText: {
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: "bold",
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
sectionSubtitle: {
  fontSize: 12,
  color: "#CCCCCC",
  marginBottom: 20,
  textAlign: "center",
  lineHeight: 18,
},
instructionBox: {
  flexDirection: "row",
  backgroundColor: "rgba(255, 215, 0, 0.1)",
  padding: 12,
  borderRadius: 8,
  marginTop: 15,
  borderLeftWidth: 3,
  borderLeftColor: "#FFD700",
},
instructionText: {
  flex: 1,
  fontSize: 12,
  color: "#FFD700",
  marginLeft: 10,
  lineHeight: 16,
},
// Agregar estos estilos al final del objeto styles
evaluationCard: {
  marginBottom: 12,
  borderRadius: 12,
  overflow: "hidden",
},
evaluationGradient: {
  padding: 16,
  borderRadius: 12,
},


trainerName: {
  fontSize: 14,
  fontWeight: "bold",
  color: "#FFD700",
  marginLeft: 8,
},
statusBadge: {
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 15,
},
statusBadgeText: {
  color: "#000000",
  fontSize: 10,
  fontWeight: "bold",
},
evaluationDateRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 8,
},
evaluationDateText: {
  fontSize: 12,
  color: "#CCCCCC",
  marginLeft: 6,
},
evaluationTimeRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 8,
},
evaluationTimeText: {
  fontSize: 12,
  color: "#4CAF50",
  marginLeft: 6,
  fontWeight: "500",
},

scheduledHeader: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 8,
},
scheduledTitle: {
  fontSize: 13,
  fontWeight: "bold",
  color: "#4CAF50",
  marginLeft: 8,
},
scheduledDetails: {
  marginLeft: 28,
},
scheduledDetail: {
  fontSize: 12,
  color: "#CCCCCC",
  marginBottom: 4,
},
scheduledNotes: {
  fontSize: 11,
  color: "#FFD700",
  fontStyle: "italic",
  marginTop: 6,
},
requestNotesContainer: {
  marginTop: 10,
  padding: 10,
  backgroundColor: "rgba(255, 215, 0, 0.05)",
  borderRadius: 8,
  borderLeftWidth: 2,
  borderLeftColor: "#FFD700",
},
requestNotesLabel: {
  fontSize: 11,
  fontWeight: "bold",
  color: "#FFD700",
  marginBottom: 4,
},
requestNotesText: {
  fontSize: 12,
  color: "#CCCCCC",
  lineHeight: 16,
},
rejectionContainer: {
  marginTop: 10,
  padding: 10,
  backgroundColor: "rgba(255, 68, 68, 0.1)",
  borderRadius: 8,
  borderLeftWidth: 2,
  borderLeftColor: "#FF4444",
  flexDirection: "row",
  alignItems: "center",
},
rejectionText: {
  fontSize: 12,
  color: "#FF4444",
  marginLeft: 8,
  flex: 1,
},
// ✅ NUEVOS ESTILOS PARA NOTAS DEL ENTRENADOR
  trainerNotesContainer: {
    marginTop: 10,
    padding: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
  },
  trainerNotesLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 5,
  },
  trainerNotesText: {
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 18,
  },
});
