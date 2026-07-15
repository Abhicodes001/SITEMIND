import { useState, useEffect, useCallback, useRef } from 'react';

export const useSpeech = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  
  useEffect(() => {
    // Check for speech recognition compatibility
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      
      rec.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };
      
      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
      };
      
      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      rec.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = rec;
    }
  }, []);
  
  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      // Cancel speech synthesis if speaking
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }
  }, [isListening]);
  
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error(err);
      }
    }
  }, [isListening]);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop current speech
      
      // Clean markdown tags out of the text before speaking
      const cleanText = text
        .replace(/\[\d+\]/g, '') // remove citation brackets
        .replace(/[#*`_~]/g, '') // remove markdown styling
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // remove markdown links
        .trim();
        
      if (!cleanText) return;
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      // Select a nice English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || 
                        voices.find(v => v.lang.startsWith('en')) || 
                        voices[0];
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);
  
  return {
    isListening,
    transcript,
    speechSupported,
    startListening,
    stopListening,
    isSpeaking,
    speak,
    stopSpeaking
  };
};
export default useSpeech;
