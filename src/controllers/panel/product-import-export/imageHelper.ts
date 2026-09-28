import * as path from 'path';
import * as fs from 'fs';
import * as clientS3 from '@aws-sdk/client-s3';

// Others
import Config from '../../../config';
import s3 from '../../../services/media/handler/s3/Config';
import { empty, logError } from '../../../utils';

//--------------------------------------------------------------
/*
    Downloads a remote "Image URL" cell (from a bulk import/update spreadsheet) and
    stores it under the same folder/filename convention the existing product image
    uploader uses (Date.now()X<random>.<ext> inside the "product" folder, local disk or
    S3 depending on Config.STORAGE.IS_LOCAL) - producing a key that MediaManager.Product
    already knows how to turn back into a servable URL. This exists because the real
    uploader (services/media/handler/Uploader.ts) is wired directly to a multer
    req/res file upload and has no buffer-based entry point to reuse for a URL fetched
    server-side during a bulk import.
*/

const PRODUCT_FOLDER = 'product';
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'image/svg+xml': 'svg' };
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg'];

const resolveExtension = (url: string, contentType: string | null): string => {
    try {
        const fromUrl = (path.extname(new URL(url).pathname) || '').replace('.', '').toLowerCase();
        if (ALLOWED_EXTENSIONS.includes(fromUrl)) return fromUrl;
    } catch (e) { /* malformed URL path - fall through to content-type */ }
    return EXTENSION_BY_CONTENT_TYPE[contentType || ''] || 'jpg';
}

export const downloadProductImage = async (url: string): Promise<{ key: string | null; error: string | null }> => {
    if (empty(url)) return { key: null, error: null };
    if (!/^https?:\/\//i.test(url)) return { key: null, error: 'Image URL must start with http:// or https://' };

    try {
        const response = await fetch(url);
        if (!response.ok) return { key: null, error: `Could not download image (HTTP ${response.status}).` };

        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.startsWith('image/')) return { key: null, error: 'That URL did not return an image.' };

        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) return { key: null, error: 'Image is too large (max 15MB).' };
        if (!arrayBuffer.byteLength) return { key: null, error: 'Image download was empty.' };

        const buffer = Buffer.from(arrayBuffer);
        const filename = `${Date.now()}X${Math.round(Math.random() * 1e9)}.${resolveExtension(url, contentType)}`;

        if (Config.STORAGE.IS_LOCAL) {
            const dir = path.join(Config.STORAGE.LOCAL_FOLDER, PRODUCT_FOLDER);
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, filename), buffer);
        } else {
            await s3.send(new clientS3.PutObjectCommand({
                Bucket: Config.AWS_S3_BUCKET.BUCKET_NAME,
                Key: `${PRODUCT_FOLDER}/${filename}`,
                Body: buffer,
                ContentType: contentType || `image/${resolveExtension(url, contentType)}`,
            }));
        }

        return { key: filename, error: null };
    } catch (e: any) {
        logError(e, '[PRODUCT-IMAGE-DOWNLOAD] -');
        return { key: null, error: 'Failed to download image from the given URL.' };
    }
}
