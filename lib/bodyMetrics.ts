// Servicio para cálculos de composición corporal (similar a tu código Kotlin)
export interface BodyMetrics {
  age: number;
  gender: 'male' | 'female';
  height: number; // cm
  weight: number; // kg
  neck?: number; // cm
  waist?: number; // cm
  hip?: number; // cm
}

export interface BodyComposition {
  bmi: number;
  bodyFat: number;
  metabolicAge: number;
  muscleMass: number;
  waterPercentage: number;
  boneMass: number;
  visceralFat: number;
  fatMass: number;
  leanMass: number;
}

const CM_TO_INCHES = 0.393701;

export class BodyMetricsCalculator {
  
  static calculateBMI(weight: number, height: number): number {
    const heightM = height / 100;
    return weight / (heightM * heightM);
  }

  static calculateBodyFat(metrics: BodyMetrics): number {
    const { age, gender, height, weight, neck, waist, hip } = metrics;
    
    if (!neck || !waist) {
      // Fórmula basada en BMI si no hay medidas de circunferencia
      const bmi = this.calculateBMI(weight, height);
      return gender === 'male' 
        ? (1.20 * bmi + 0.23 * age - 16.2)
        : (1.20 * bmi + 0.23 * age - 5.4);
    }

    // Fórmula de la Marina de EE.UU. (US Navy)
    const heightIn = height * CM_TO_INCHES;
    const neckIn = neck * CM_TO_INCHES;
    const waistIn = waist * CM_TO_INCHES;
    const hipIn = hip ? hip * CM_TO_INCHES : 0;

    if (gender === 'male') {
      const logDiff = Math.max(waistIn - neckIn, 0.1);
      return 86.010 * Math.log10(logDiff) - 70.041 * Math.log10(heightIn) + 36.76;
    } else {
      const logSum = Math.max(waistIn + hipIn - neckIn, 0.1);
      return 163.205 * Math.log10(logSum) - 97.684 * Math.log10(heightIn) - 78.687;
    }
  }

  static calculateMuscleMass(weight: number, height: number, age: number, gender: string): number {
    const genderConstant = gender === 'male' ? 6.6 : -0.5;
    const heightM = height / 100;
    const smmKg = (0.244 * weight) + (7.80 * heightM) - (0.098 * age) + genderConstant;
    return Math.max(smmKg, 0);
  }

  static calculateAllMetrics(metrics: BodyMetrics): BodyComposition {
    const { age, gender, height, weight } = metrics;
    
    const bmi = this.calculateBMI(weight, height);
    const bodyFat = this.calculateBodyFat(metrics);
    const muscleMass = this.calculateMuscleMass(weight, height, age, gender);
    const musclePercent = (muscleMass / weight) * 100;

    // Cálculos adicionales
    const boneMass = gender === 'male' ? 15.0 : 12.0;
    const remainingForWater = 100 - bodyFat - musclePercent - boneMass;
    const waterPercentage = Math.max(Math.min(remainingForWater, 65), 50);
    
    const metabolicAge = Math.round(age + (bmi - 21) * 0.5);
    const fatMass = weight * (bodyFat / 100);
    const leanMass = weight - fatMass;
    
    // Estimación de grasa visceral basada en waist-to-height ratio
    const waistToHeight = metrics.waist ? metrics.waist / height : 0.5;
    const visceralFat = Math.round(waistToHeight * 20);

    return {
      bmi: Number(bmi.toFixed(1)),
      bodyFat: Number(bodyFat.toFixed(1)),
      metabolicAge,
      muscleMass: Number(muscleMass.toFixed(1)),
      waterPercentage: Number(waterPercentage.toFixed(1)),
      boneMass: Number(boneMass.toFixed(1)),
      visceralFat,
      fatMass: Number(fatMass.toFixed(1)),
      leanMass: Number(leanMass.toFixed(1))
    };
  }

  static getBMICategory(bmi: number): string {
    if (bmi < 18.5) return 'Bajo peso';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Sobrepeso';
    return 'Obesidad';
  }

  static getBodyFatCategory(bodyFat: number, gender: string): string {
    if (gender === 'male') {
      if (bodyFat < 6) return 'Esencial';
      if (bodyFat < 14) return 'Atleta';
      if (bodyFat < 18) return 'Fitness';
      if (bodyFat < 25) return 'Aceptable';
      return 'Obeso';
    } else {
      if (bodyFat < 14) return 'Esencial';
      if (bodyFat < 21) return 'Atleta';
      if (bodyFat < 25) return 'Fitness';
      if (bodyFat < 32) return 'Aceptable';
      return 'Obesa';
    }
  }
}