import { GoogleGenAI, Type, Content } from "@google/genai";
import { AnalysisResult } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const schema = {
  type: Type.OBJECT,
  properties: {
    temperature: {
      type: Type.INTEGER,
      description: "A numerical score from 0 (very calm) to 100 (very aggressive/hostile) based on the overall context."
    },
    emotion: {
      type: Type.STRING,
      description: "The primary negative or conflict-driving emotion detected in the provided context (e.g., 'Anger', 'Frustration', 'Sarcasm'). If neutral, use 'Neutral'."
    },
    suggestion: {
      type: Type.STRING,
      description: "A rephrased version of the user's text or a suggested response to the conversation in the image. This should be empathetic, neutral, and constructive advice."
    },
    explanation: {
      type: Type.STRING,
      description: "A brief, one-sentence explanation of why the suggestion is an effective and constructive way to respond in the given context."
    },
    recipientImpact: {
        type: Type.OBJECT,
        description: "An analysis of the likely impact the user's original text (or the AI's suggested response) will have on the person receiving it.",
        properties: {
            predictedFeeling: {
                type: Type.STRING,
                description: "The likely primary emotion the recipient will feel (e.g., 'Understood', 'Relieved', 'Defensive', 'Hurt')."
            },
            impactExplanation: {
                type: Type.STRING,
                description: "A brief, one-sentence explanation of why the recipient might feel that way and the potential positive or negative impact on the conversation's progress."
            }
        },
        required: ["predictedFeeling", "impactExplanation"]
    }
  },
  required: ["temperature", "emotion", "suggestion", "explanation", "recipientImpact"]
};

const topicInstructions: { [key: string]: { [lang: string]: string } } = {
    'gender-equality': {
        en: 'In your analysis, pay special attention to language related to gender equality. Identify any potential gender bias, stereotypes, or microaggressions. Your suggestions should promote respectful, inclusive, and equitable communication between genders.',
        ko: '분석 시 성 평등과 관련된 언어에 특히 주의를 기울여 주십시오. 잠재적인 성 편견, 고정관념 또는 미묘한 차별을 식별하십시오. 당신의 제안은 성별 간에 존중하고 포용적이며 공평한 의사소통을 촉진해야 합니다.'
    },
    'human-rights': {
        en: 'Analyze the conversation through a human rights lens. Identify any language that may be discriminatory, dehumanizing, or disrespectful of fundamental rights. Provide suggestions that uphold dignity, respect, and empathy for all individuals.',
        ko: '인권의 관점에서 대화를 분석하십시오. 차별적이거나, 비인간적이거나, 기본권을 무시하는 언어가 있는지 식별하십시오. 모든 개인에 대한 존엄성, 존중, 공감을 지지하는 제안을 제공하십시오.'
    },
    'violence-prevention': {
        en: 'Focus on de-escalation and violence prevention. Analyze the text for aggressive language, threats, or warning signs of conflict escalation. Your suggestions must prioritize safety and guide the user toward peaceful resolutions and non-violent communication techniques.',
        ko: '상황 완화 및 폭력 예방에 중점을 두십시오. 공격적인 언어, 위협 또는 갈등 고조의 경고 신호가 있는지 텍스트를 분석하십시오. 당신의 제안은 안전을 최우선으로 해야 하며, 사용자를 평화로운 해결책과 비폭력적인 의사소통 기술로 안내해야 합니다.'
    },
    'workplace-conflict': {
        en: 'Analyze the conversation within the context of a school or workplace. Consider power dynamics, professionalism, and constructive conflict resolution. Suggestions should be practical for a professional or academic setting, aiming to resolve disputes while maintaining relationships.',
        ko: '학교나 직장 내의 맥락에서 대화를 분석하십시오. 권력 역학, 전문성, 건설적인 갈등 해결을 고려하십시오. 제안은 관계를 유지하면서 분쟁을 해결하는 것을 목표로 전문적이거나 학문적인 환경에 실용적이어야 합니다.'
    }
};


export const analyzeContent = async (
    text: string, 
    language: string,
    socialTopic: string,
    imageBase64?: string, 
    imageMimeType?: string
): Promise<AnalysisResult> => {
  const languageMap: { [key: string]: string } = {
    en: 'English',
    ko: 'Korean',
    es: 'Spanish',
    fr: 'French',
    ja: 'Japanese',
    zh: 'Chinese',
  };
  const responseLanguage = languageMap[language] || 'English';

  let systemInstruction = imageBase64 
    ? `You are an expert communication coach named 'PeaceTalk'. Analyze the conversation in the provided image. The user has also provided text which might be a draft response or a question. Your goal is to give them the best advice on how to respond. Analyze the emotional tone, predict impact, and suggest a constructive, empathetic response.`
    : `You are an expert communication coach named 'PeaceTalk'. Your goal is to analyze user-provided text to identify its emotional tone, predict its likely impact on the recipient, and suggest a more constructive, empathetic, and neutral alternative.`;

  const topicInstructionSet = topicInstructions[socialTopic];
  if (topicInstructionSet) {
      const topicTitle = socialTopic.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      systemInstruction += `\n\n**Special Coaching Focus: ${topicTitle}**\n${topicInstructionSet[language] || topicInstructionSet['en']}`;
  }

  systemInstruction += ` You must always respond in ${responseLanguage} in the structured JSON format defined by the schema.`;


  const textPart = { text: text || "Please analyze the conversation in the image and advise me on the best way to respond to continue the conversation peacefully." };
  
  let contents: Content;

  if (imageBase64 && imageMimeType) {
    const imagePart = {
      inlineData: {
        mimeType: imageMimeType,
        data: imageBase64,
      },
    };
    contents = { parts: [imagePart, textPart] };
  } else {
    contents = { parts: [textPart] };
  }
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });
    
    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);
    return result as AnalysisResult;

  } catch (error) {
    console.error("Error analyzing content with Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to get analysis from AI: ${error.message}`);
    }
    throw new Error("An unknown error occurred while analyzing the content.");
  }
};