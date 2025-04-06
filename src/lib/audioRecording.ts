export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingStream: MediaStream | null = null;

  async startRecording(includeSystemAudio: boolean = false): Promise<void> {
    try {
      // Get microphone stream
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      let combinedStream = micStream;

      // If system audio is requested, try to capture it
      if (includeSystemAudio) {
        try {
          const systemStream = await (navigator.mediaDevices as any).getDisplayMedia({
            audio: true,
            video: false
          });
          
          // Combine microphone and system audio
          const audioContext = new AudioContext();
          const micSource = audioContext.createMediaStreamSource(micStream);
          const systemSource = audioContext.createMediaStreamSource(systemStream);
          const destination = audioContext.createMediaStreamDestination();
          
          micSource.connect(destination);
          systemSource.connect(destination);
          
          combinedStream = destination.stream;
        } catch (err) {
          console.warn('Could not capture system audio:', err);
        }
      }

      this.recordingStream = combinedStream;
      this.audioChunks = [];
      
      this.mediaRecorder = new MediaRecorder(combinedStream);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
    } catch (err) {
      console.error('Error starting recording:', err);
      throw err;
    }
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.audioChunks = [];
        
        if (this.recordingStream) {
          this.recordingStream.getTracks().forEach(track => track.stop());
          this.recordingStream = null;
        }
        
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}