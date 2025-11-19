import { apiClient } from './client';

// Integrações Core - Wrappers para API local
export const Core = {
  InvokeLLM: async (params) => {
    return apiClient.post('/api/integrations/llm', params);
  },

  SendEmail: async (params) => {
    return apiClient.post('/api/integrations/email', params);
  },

  SendSMS: async (params) => {
    return apiClient.post('/api/integrations/sms', params);
  },

  UploadFile: async (file, params = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(params).forEach(key => {
      formData.append(key, params[key]);
    });
    return apiClient.post('/api/integrations/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  GenerateImage: async (params) => {
    return apiClient.post('/api/integrations/image', params);
  },

  ExtractDataFromUploadedFile: async (params) => {
    return apiClient.post('/api/integrations/extract', params);
  },
};

// Exports individuais para compatibilidade
export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const SendSMS = Core.SendSMS;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;






