import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AnalysisResult } from './types';
import { analyzeContent } from './services/geminiService';
import TemperatureGauge from './components/TemperatureGauge';
import SuggestionCard from './components/SuggestionCard';
import ImpactAnalysisCard from './components/ImpactAnalysisCard';
import EmotionChart from './components/EmotionChart';
import { WandIcon, UploadIcon, TrashIcon, MicrophoneIcon } from './components/IconComponents';
import { translations, Language } from './translations';

// Fix: Add TypeScript interfaces for the Web Speech API to resolve 'Cannot find name 'SpeechRecognition''.
// These are not included in default DOM typings.
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

// FIX: Renamed interface to avoid collision with native browser type.
interface SpeechRecognitionService extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

type SocialTopic = 'general' | 'gender-equality' | 'human-rights' | 'violence-prevention' | 'workplace-conflict';
type FeedbackState = 'none' | 'submitted';

const speechLangMap: { [key in Language]: string } = {
    en: 'en-US',
    ko: 'ko-KR',
    es: 'es-ES',
    fr: 'fr-FR',
    ja: 'ja-JP',
    zh: 'zh-CN',
};

const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAnalyzingFrame, setIsAnalyzingFrame] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [socialTopic, setSocialTopic] = useState<SocialTopic>('general');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('none');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analysisIntervalRef = useRef<number | null>(null);
  const isAnalyzingFrameRef = useRef(false);
  const baseTextRef = useRef('');

  // Speech Recognition setup
  const speechRecognitionRef = useRef<SpeechRecognitionService | null>(null);
  const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const isSpeechRecognitionSupported = !!SpeechRecognitionAPI;
  
  const handleAnalyze = useCallback(async () => {
    if ((!inputText.trim() && !imageBase64) || isLoading) return;

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setFeedbackState('none');

    try {
      const result = await analyzeContent(inputText, language, socialTopic, imageBase64 ?? undefined, imageMimeType ?? undefined);
      setAnalysisResult(result);
      setAnalysisHistory(prev => [...prev, result].slice(-15)); // Keep last 15 results
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, language, imageBase64, imageMimeType, socialTopic]);

  const analysisFnRef = useRef(handleAnalyze);
  useEffect(() => {
    analysisFnRef.current = handleAnalyze;
  }, [handleAnalyze]);


  const t = useCallback((key: keyof typeof translations.en) => {
    return translations[language][key] || translations.en[key];
  }, [language]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
  });

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        setError(t('imageSizeError'));
        return;
      }
      try {
        stopScreenSharing();
        const base64 = await fileToBase64(file);
        setImageBase64(base64);
        setImageMimeType(file.type);
        setError(null);
      } catch (err) {
        setError(t('imageLoadError'));
      }
    }
  };

  const handleRemoveImage = () => {
    setImageBase64(null);
    setImageMimeType(null);
    if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
    
  const stopScreenSharing = useCallback(() => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScreenSharing(false);
    setAnalysisResult(null);
  }, []);

  const analyzeFrame = useCallback(async () => {
    if (isAnalyzingFrameRef.current || !videoRef.current || !canvasRef.current) {
      return;
    }
    isAnalyzingFrameRef.current = true;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
        isAnalyzingFrameRef.current = false;
        return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frameDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const frameBase64 = frameDataUrl.split(',')[1];
    setIsAnalyzingFrame(true);
    setError(null);
    setFeedbackState('none');
    try {
      const result = await analyzeContent(inputText, language, socialTopic, frameBase64, 'image/jpeg');
      if (mediaStreamRef.current) {
        setAnalysisResult(result);
        setAnalysisHistory(prev => [...prev, result].slice(-15)); // Keep last 15 results
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      stopScreenSharing();
    } finally {
      setIsAnalyzingFrame(false);
      isAnalyzingFrameRef.current = false;
    }
  }, [inputText, language, stopScreenSharing, socialTopic]);
  
  const analysisFrameFnRef = useRef(analyzeFrame);
  useEffect(() => {
    analysisFrameFnRef.current = analyzeFrame;
  }, [analyzeFrame]);

  const startScreenSharing = async () => {
    try {
      handleRemoveImage();
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsScreenSharing(true);
      stream.getVideoTracks()[0].onended = () => {
          stopScreenSharing();
      };
      analysisIntervalRef.current = window.setInterval(() => {
        analysisFrameFnRef.current();
      }, 5000);
    } catch (err) {
      console.error("Screen share error:", err);
      setError("Failed to start screen sharing. Please ensure permissions are granted.");
      setIsScreenSharing(false);
    }
  };

  const handleToggleRecording = () => {
    if (!isSpeechRecognitionSupported) {
        setError(t('micNotSupportedError'));
        return;
    }
    const recognition = speechRecognitionRef.current;
    if (!recognition) return;

    if (isRecording) {
        recognition.stop();
        setIsRecording(false);
    } else {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => {
                baseTextRef.current = inputText;
                recognition.lang = speechLangMap[language];
                recognition.start();
                setIsRecording(true);
                setError(null);
            })
            .catch(() => {
                setError(t('micPermissionError'));
                setIsRecording(false);
            });
    }
  };

  const handleFeedback = (type: 'like' | 'dislike', comment?: string) => {
    console.log('--- Feedback Submitted ---');
    console.log('Type:', type);
    console.log('Original Text:', inputText);
    console.log('AI Suggestion:', analysisResult?.suggestion);
    if (comment) {
      console.log('Comment:', comment);
    }
    console.log('------------------------');
    setFeedbackState('submitted');
  };

  useEffect(() => {
    if (!isSpeechRecognitionSupported) {
        console.warn("Speech recognition not supported by this browser.");
        return;
    }
    
    // FIX: Use the renamed interface type.
    const recognition: SpeechRecognitionService = new SpeechRecognitionAPI();
    speechRecognitionRef.current = recognition;
    
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        setInputText(baseTextRef.current + transcript);
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setError(t('micPermissionError'));
        } else {
            console.error(`Speech recognition error: ${event.error}`);
        }
        setIsRecording(false);
    };
    
    recognition.onend = () => {
        setIsRecording(false);
    };

    return () => {
        if (recognition) {
          recognition.stop();
        }
    };
  }, [isSpeechRecognitionSupported, t]);
  
  useEffect(() => {
    if (speechRecognitionRef.current) {
        speechRecognitionRef.current.lang = speechLangMap[language];
    }
  }, [language]);

  // Effect for auto-analysis on typing pause (debounced)
  useEffect(() => {
    if (isScreenSharing || imageBase64 || !inputText.trim()) {
      return;
    }

    const handler = setTimeout(() => {
      analysisFnRef.current();
    }, 1000);

    return () => clearTimeout(handler);
  }, [inputText, imageBase64, isScreenSharing]);
  
  // Effect to clear results when input is cleared
  useEffect(() => {
    if (!inputText.trim() && !imageBase64 && !isScreenSharing) {
      setAnalysisResult(null);
      setError(null);
      setFeedbackState('none');
      setAnalysisHistory([]);
    }
  }, [inputText, imageBase64, isScreenSharing]);
  
  useEffect(() => {
      return () => {
          stopScreenSharing();
      };
  }, [stopScreenSharing]);


  const getEmotionPillColor = (emotion: string) => {
    switch (emotion.toLowerCase()) {
      case 'anger': case 'contempt': case 'hostility':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      case 'frustration': case 'annoyance': case 'sarcasm':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
      case 'neutral':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
      case 'positive': case 'empathy':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
    }
  };

  const LoadingSpinner: React.FC = () => (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
        <p className="text-slate-500 dark:text-slate-400">{t('loadingMessage')}</p>
    </div>
  );

  const LanguageSwitcher: React.FC = () => (
    <div className="flex justify-center">
        <div className="relative">
            <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="appearance-none w-auto bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 py-2 pl-4 pr-10 rounded-md leading-tight focus:outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                aria-label={t('languageSelectorLabel')}
            >
                {(Object.keys(translations) as Language[]).map((lang) => (
                    <option key={lang} value={lang}>
                        {translations[lang].languageName}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 dark:text-slate-200">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
        </div>
    </div>
  );

  const socialTopics: { id: SocialTopic; labelKey: keyof typeof translations.en }[] = [
    { id: 'general', labelKey: 'topicGeneral' },
    { id: 'gender-equality', labelKey: 'topicGenderEquality' },
    { id: 'human-rights', labelKey: 'topicHumanRights' },
    { id: 'violence-prevention', labelKey: 'topicViolencePrevention' },
    { id: 'workplace-conflict', labelKey: 'topicWorkplaceConflict' },
  ];

  const SocialTopicSelector: React.FC = () => (
    <div className="mt-6">
        <h2 className="text-center text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">{t('socialTopicTitle')}</h2>
        <div className="flex flex-wrap justify-center gap-2">
            {socialTopics.map(({ id, labelKey }) => (
                <button key={id} onClick={() => setSocialTopic(id)} disabled={isLoading}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors disabled:opacity-50 ${ socialTopic === id ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600'}`}>
                    {t(labelKey)}
                </button>
            ))}
        </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-4">
          <h1 className="text-4xl sm:text-5xl font-bold text-sky-600 dark:text-sky-400">{t('title')}</h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t('slogan')}</p>
        </header>
        
        <div className="space-y-6 mb-8">
            <LanguageSwitcher />
            <SocialTopicSelector />
        </div>
        
        <canvas ref={canvasRef} className="hidden"></canvas>

        <main>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            {isScreenSharing && (
                <div className="relative group">
                    <video ref={videoRef} autoPlay playsInline muted className="rounded-lg max-h-60 w-auto mx-auto bg-black"></video>
                    {isAnalyzingFrame && (
                       <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                           <div className="flex items-center space-x-2 text-white">
                               <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                               <span>{t('analyzingFrame')}</span>
                           </div>
                       </div>
                    )}
                </div>
            )}
            {imageBase64 && !isScreenSharing && (
              <div className="relative group">
                <img src={`data:${imageMimeType};base64,${imageBase64}`} alt="Conversation preview" className="rounded-lg max-h-60 w-auto mx-auto"/>
                <button 
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={t('removeImage')}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            )}
            <div>
              <label htmlFor="message-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {imageBase64 || isScreenSharing ? t('addContext') : t('enterText')}
              </label>
              <textarea
                id="message-input" rows={4}
                className="w-full p-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-150"
                placeholder={imageBase64 || isScreenSharing ? t('placeholderWithImage') : t('placeholder')}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => fileInputRef.current?.click()} disabled={isLoading || isScreenSharing}
                className="w-full sm:w-auto flex items-center justify-center px-6 py-3 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition-colors">
                <UploadIcon className="h-5 w-5 mr-2" />
                {t('uploadImage')}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/png, image/jpeg, image/webp" className="hidden" />

              <button onClick={handleToggleRecording} disabled={isLoading}
                className={`w-full sm:w-auto flex items-center justify-center px-6 py-3 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors ${
                  isRecording 
                  ? 'border-red-500 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 focus:ring-red-500 animate-pulse'
                  : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:ring-sky-500'
                }`}>
                <MicrophoneIcon className="h-5 w-5 mr-2" />
                {isRecording ? t('stopRecording') : t('recordVoice')}
              </button>

              <button onClick={isScreenSharing ? stopScreenSharing : startScreenSharing} disabled={isLoading}
                className={`w-full sm:w-auto flex items-center justify-center px-6 py-3 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors ${
                  isScreenSharing 
                  ? 'border-amber-500 text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-900 focus:ring-amber-500'
                  : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:ring-sky-500'
                }`}>
                {isScreenSharing ? t('stopSharing') : t('shareScreen')}
              </button>

              <button onClick={handleAnalyze} disabled={isLoading || (!inputText.trim() && !imageBase64) || isScreenSharing}
                className="flex-grow flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-400 disabled:cursor-not-allowed dark:focus:ring-offset-slate-900 transition-colors duration-200">
                {isLoading ? (
                  <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>{t('analyzingButton')}</>
                ) : (
                  <><WandIcon className="h-5 w-5 mr-2" />{imageBase64 ? t('analyzeImageButton') : t('analyzeButton')}</>
                )}
              </button>
            </div>
          </div>

          <div className="mt-8">
            {isLoading && !isScreenSharing && <LoadingSpinner />}
            {error && (
              <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg" role="alert">
                <strong className="font-bold">{t('errorPrefix')}</strong> <span className="block sm:inline">{error}</span>
              </div>
            )}
            {analysisResult && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                <div className="space-y-8">
                  <TemperatureGauge temperature={analysisResult.temperature} title={t('conversationTemperature')} />
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
                    <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">{t('dominantEmotion')}</h3>
                    <div className={`mt-2 inline-block px-4 py-1.5 text-base font-semibold rounded-full ${getEmotionPillColor(analysisResult.emotion)}`}>
                      {analysisResult.emotion}
                    </div>
                  </div>
                  <ImpactAnalysisCard title={t('impactAnalysisTitle')} feelingLabel={t('predictedFeeling')} impactLabel={t('potentialImpact')}
                    predictedFeeling={analysisResult.recipientImpact.predictedFeeling} impactExplanation={analysisResult.recipientImpact.impactExplanation}
                  />
                   {analysisHistory.length > 1 && (
                      <EmotionChart history={analysisHistory} title={t('emotionTrendTitle')} />
                  )}
                </div>
                <SuggestionCard 
                  suggestion={analysisResult.suggestion} 
                  explanation={analysisResult.explanation} 
                  title={t('suggestionCardTitle')}
                  explanationPrefix={t('suggestionCardExplanationPrefix')}
                  feedbackPrompt={t('feedbackPrompt')}
                  feedbackThanks={t('feedbackThanks')}
                  likeButtonLabel={t('likeButton')}
                  dislikeButtonLabel={t('dislikeButton')}
                  feedbackCommentPlaceholder={t('feedbackPlaceholder')}
                  submitFeedbackButtonLabel={t('submitFeedback')}
                  feedbackState={feedbackState}
                  onFeedback={handleFeedback}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;