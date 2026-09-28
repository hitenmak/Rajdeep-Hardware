// Helpers
import { log, logInfo, logWarn, logError, logSuccess } from '../../utils';
import { Format } from './helper';

// Others
import { ADMIN_MSG } from '../../common/messages';

//--------------------------------------------------------------

export default class WhatsApp {

    static async verify(req: any, res: any): Promise<void> {
        try {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];

            if (mode && token === '2026') {
                logSuccess('Webhook verified');
                return res.status(200).send(challenge);
            } else {
                return res.sendStatus(403);
            }
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

    static async handler(req: any, res: any): Promise<void> {
        try {
            const body = req.body;
            // log(JSON.stringify(body, null, 2), 'Incoming webhook:');

            if (body.object) {
                const entry = body.entry?.[0];
                const changes = entry?.changes?.[0];
                const value = changes?.value;

                // Incoming message
                if (value?.messages) {
                    const message = value.messages[0];
                    const from = message.from;
                    const text = message.text?.body;

                    // log(text, `Message from ${from}`);
                }

                // Status updates
                if (value?.statuses) {
                    const status = value.statuses[0];
                    // log(status.status, `Status:`);
                }

                return res.status(200).send('EVENT_RECEIVED');
            }

            res.sendStatus(404);
        } catch (e: any) {
            return res.status(500).send({ status: false, message: e?.log?.error || e?.message, data: {} });
        }
    }

}