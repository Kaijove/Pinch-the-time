// Handles webcam access, permissions and cleanup.
// Exposes a hidden <video> element that MediaPipe will read from.

export class CameraService {
  private stream: MediaStream | null = null;
  readonly videoElement: HTMLVideoElement;

  constructor() {
    this.videoElement = document.createElement('video');
    this.videoElement.playsInline = true;
    this.videoElement.muted = true;
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 },
        facingMode: 'user',
      },
      audio: false,
    });
    this.videoElement.srcObject = this.stream;
    await this.videoElement.play();
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.videoElement.srcObject = null;
  }
}
