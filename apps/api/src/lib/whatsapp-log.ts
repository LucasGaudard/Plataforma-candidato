import type { WhatsappTestState } from '@platform/types';

// In-memory store para os logs de teste do WhatsApp.
// Isso atende ao requisito de manter o estado entre diferentes navegadores
// de administradores sem alterar o banco de dados do Prisma.

let state: WhatsappTestState = {
  lastConnectionTest: null,
  lastMessageTest: null,
  lastWebhookTest: null,
  totalTestsRun: 0,
};

export const whatsappLogStore = {
  getState: () => state,
  
  updateConnectionTest: (success: boolean, data?: any) => {
    state.lastConnectionTest = { success, date: new Date().toISOString(), data };
    state.totalTestsRun++;
  },
  
  updateMessageTest: (success: boolean, phone: string) => {
    state.lastMessageTest = { success, date: new Date().toISOString(), phone };
    state.totalTestsRun++;
  },
  
  updateWebhookTest: (success: boolean) => {
    state.lastWebhookTest = { success, date: new Date().toISOString() };
    state.totalTestsRun++;
  },
};
