import * as Canvas from 'canvas';
const { createCanvas } = Canvas;
import JsBarcode from 'jsbarcode';

// Interfaces
import { IGenerate } from './interfaces';

//--------------------------------------------------------------

export default class BarCode {

    static generate(value: string): IGenerate {
        const canvas = createCanvas(200, 80);

        JsBarcode(canvas, value, {
            format: 'CODE128',
            displayValue: true,
            fontSize: 15,
            height: 80,
            width: 1,
            margin: 2
        });
        let buffer: any = canvas.toBuffer('image/png');

        const base64 = Buffer.from(buffer).toString('base64');
        return { base64, value };
    }

};