import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, WhatsappStatus } from '@prisma/client';

const prisma = new PrismaClient();

export default async function webhookRoutes(fastify: FastifyInstance) {
  // Verificação de token da Meta
  fastify.get('/whatsapp', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as {
      'hub.mode'?: string;
      'hub.verify_token'?: string;
      'hub.challenge'?: string;
    };

    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode && token) {
      if (mode === 'subscribe' && token === verifyToken) {
        return reply.status(200).send(challenge);
      } else {
        return reply.status(403).send();
      }
    }
    return reply.status(400).send();
  });

  // Recebimento de mensagens (Webhook)
  fastify.post('/whatsapp', async (request: FastifyRequest, reply: FastifyReply) => {
    const body: any = request.body;

    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const message = body.entry[0].changes[0].value.messages[0];
        const from = message.from; // formato: '5511999999999'
        const msgBody = message.text?.body?.trim().toUpperCase();

        if (from && msgBody) {
          // Remove o código do país (55) se existir
          let phoneToSearch = from;
          if (phoneToSearch.startsWith('55') && phoneToSearch.length > 11) {
            phoneToSearch = phoneToSearch.substring(2);
          }

          const user = await prisma.user.findFirst({
            where: { phone: phoneToSearch },
          });

          if (user) {
            if (msgBody === 'SIM') {
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  whatsappStatus: WhatsappStatus.CONFIRMED,
                  whatsappConfirmedAt: new Date(),
                  whatsappLastResponse: msgBody,
                },
              });
            } else if (['SAIR', 'PARAR', 'CANCELAR'].includes(msgBody)) {
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  whatsappStatus: WhatsappStatus.OPT_OUT,
                  whatsappLastResponse: msgBody,
                },
              });
            } else {
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  whatsappLastResponse: msgBody,
                },
              });
            }
          }
        }
      }
      return reply.status(200).send('EVENT_RECEIVED');
    } else {
      return reply.status(404).send();
    }
  });
}
