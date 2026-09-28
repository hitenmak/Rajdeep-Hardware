import * as clientS3 from '@aws-sdk/client-s3';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty } from '../../../../utils';
import s3 from './Config';

// Others
import Config from '../../../../config';

//--------------------------------------------------------------

export default async (): Promise<void> => {
    try {
        const { Buckets } = await s3.send(new clientS3.ListBucketsCommand({}));
        if (empty(Buckets)) throw 'No bucket yet!';

        const bucketName = Config.AWS_S3_BUCKET.BUCKET_NAME;
        let connectedBucket = null;

        (Buckets || []).forEach(({ Name }) => {
            if (Name === bucketName) connectedBucket = bucketName;
        })

        if (connectedBucket) {
            logSuccess(`[S3-BUCKET] - connected: ${connectedBucket}`, null);
        } else {
            throw `Specified bucket ${bucketName} not found`;
        }

    } catch (e: any) {
        logError(`[S3-BUCKET] - not connected - Error: ${typeof e === 'string' ? e : e.message}`, null);
        if (!process.env.APP_DEBUG) process.exit(0);
    }
}