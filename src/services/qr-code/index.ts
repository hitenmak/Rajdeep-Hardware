import qr from 'qr-image-color';

// Others
import { QR_CODE } from '../../config/Constant';

// Interfaces
import { IGenerate } from './interfaces';

//--------------------------------------------------------------

export default class QRCode {

    static DEFAULT_QR_COLOR = '#000000';
    static DEFAULT_QR_SIZE = 11;

    static generate(value: string, options: qr.Options = {}): IGenerate {
        const qrBuffer: any = qr.imageSync(value, { type: 'png', size: QR_CODE.SIZE || this.DEFAULT_QR_SIZE, color: QR_CODE.COLOR || this.DEFAULT_QR_COLOR, transparent: true, ...options });
        const base64 = Buffer.from(qrBuffer).toString('base64');
        return { base64, value };
    }

};