import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
}

export default function VideoPlayer({ videoUrl, thumbnailUrl }: VideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handlePlayPause = async () => {
    if (status.isPlaying) {
      await videoRef.current?.pauseAsync();
    } else {
      await videoRef.current?.playAsync();
    }
  };

  const handleError = (error: string) => {
    console.error('Video error:', error);
    setHasError(true);
    setIsLoading(false);
    Alert.alert('Error', 'No se puede reproducir el video');
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleLoad = (status: any) => {
    setIsLoading(false);
    setStatus(status);
  };

  if (hasError) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Ionicons name="videocam-off" size={50} color="#666" />
        <Ionicons name="warning" size={24} color="#666" style={styles.warningIcon} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        style={styles.video}
        source={{ uri: videoUrl }}
        resizeMode={ResizeMode.CONTAIN}
        isLooping={false}
        onPlaybackStatusUpdate={setStatus}
        onError={() => handleError('Video playback error')}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        useNativeControls={false}
      />
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}

      {!isLoading && (
        <TouchableOpacity 
          style={styles.playButton}
          onPress={handlePlayPause}
        >
          <Ionicons 
            name={status.isPlaying ? "pause" : "play"} 
            size={30} 
            color="white" 
          />
        </TouchableOpacity>
      )}

      {/* Controles de progreso simples */}
      {!isLoading && status.isLoaded && (
        <View style={styles.controls}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progress, 
                { width: `${(status.positionMillis / status.durationMillis) * 100}%` }
              ]} 
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width - 40,
    height: 200,
    backgroundColor: '#000',
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 10,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -25,
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  warningIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
});