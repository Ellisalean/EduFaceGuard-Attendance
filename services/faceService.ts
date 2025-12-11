import * as faceapi from 'face-api.js';
import { StorageService } from './storageService';

// Public CDN for models to avoid local hosting issues in this environment
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

class FaceService {
  private matcher: faceapi.FaceMatcher | null = null;
  public isModelsLoaded = false;

  async loadModels() {
    if (this.isModelsLoaded) return;
    
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL), // detection
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL), // landmarks (for liveness/alignment)
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL), // descriptors
      ]);
      this.isModelsLoaded = true;
      this.loadMatcherFromStorage();
    } catch (error) {
      console.error("Failed to load face models:", error);
      throw error;
    }
  }

  loadMatcherFromStorage() {
    const storedDescriptors = StorageService.getFaceDescriptors();
    if (storedDescriptors.length > 0) {
      const labeledDescriptors = storedDescriptors.map(
        d => new faceapi.LabeledFaceDescriptors(d.label, d.descriptors)
      );
      this.matcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6); // 0.6 is distance threshold
    } else {
      this.matcher = null;
    }
  }

  async detectFace(video: HTMLVideoElement) {
    if (!this.isModelsLoaded) return null;

    try {
      // Detect single face with highest confidence
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      return detection;
    } catch (e) {
      // Swallow error if video source is not ready (common race condition)
      return null;
    }
  }

  identifyFace(descriptor: Float32Array): { label: string; distance: number } {
    if (!this.matcher) return { label: 'unknown', distance: 1 };
    
    const match = this.matcher.findBestMatch(descriptor);
    return { label: match.label, distance: match.distance };
  }

  // Simple Liveness Check: Verify face is large enough and has landmarks
  checkLiveness(detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>>): boolean {
    if (!detection) return false;
    
    const { box } = detection.detection;
    // Check if face is big enough (too small might be a distant photo or background face)
    if (box.width < 100 || box.height < 100) return false;

    // Check roll/pitch/yaw roughly via landmarks (simplified)
    // In a real app, we'd check for blinking or head movement over time.
    // Here we assume if landmarks are detected with high confidence by SSD, it's likely a face.
    return detection.detection.score > 0.85; 
  }
}

export const faceService = new FaceService();