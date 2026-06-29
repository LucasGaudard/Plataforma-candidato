import { User, Role, WhatsappStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

export class WhatsappService {
  private isEnabled(): boolean {
    return process.env.WHATSAPP_ENABLED === 'true';
  }

  async sendConfirmationMessage(user: User): Promise<void> {
    if (user.role !== Role.USER) {
      return;
    }

    if (!this.isEnabled()) {
      console.log(`[SIMULAÇÃO] Mensagem de confirmação que seria enviada para (${user.phone.substring(0, 2)}) ${user.phone.substring(2)} (User ID: ${user.id})`);
      return;
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const version = process.env.WHATSAPP_API_VERSION || 'v19.0';

    if (!token || !phoneId) {
      console.error('WHATSAPP_ACCESS_TOKEN ou WHATSAPP_PHONE_NUMBER_ID ausentes.');
      return;
    }

    try {
      // Sanitizar número: remover não-dígitos e adicionar DDI 55
      const sanitizedPhone = user.phone.replace(/\D/g, '');
      const to = sanitizedPhone.startsWith('55') ? sanitizedPhone : `55${sanitizedPhone}`;

      const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: {
          body: `Olá ${user.firstName}! Confirmamos o seu cadastro na campanha da Paula Quintanilha. Responda SIM para confirmar seu interesse em continuar recebendo atualizações. Responda SAIR a qualquer momento para não receber mais mensagens.`,
        },
      };

      const response = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro ao enviar mensagem WhatsApp:', errorData);
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            whatsappStatus: WhatsappStatus.FAILED,
            whatsappError: JSON.stringify(errorData)
          }
        });
        return;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          whatsappStatus: WhatsappStatus.SENT,
          whatsappLastSent: new Date(),
        },
      });
    } catch (error) {
      console.error('Exceção ao enviar mensagem WhatsApp:', error);
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          whatsappStatus: WhatsappStatus.FAILED,
          whatsappError: (error as Error).message
        }
      });
    }
  }
}

export const whatsappService = new WhatsappService();
