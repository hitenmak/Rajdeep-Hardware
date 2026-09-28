import { S3Client } from '@aws-sdk/client-s3';

// Others
import Config from '../../../../config';

// Interfaces
import { IConfig } from './interfaces';

//--------------------------------------------------------------

const config: IConfig = {
    region: Config.AWS_S3_BUCKET.REGION,
    credentials: {
        accessKeyId: Config.AWS_S3_BUCKET.ACCESS_KEY,
        secretAccessKey: Config.AWS_S3_BUCKET.SECRET_KEY,
    }
}

export default new S3Client(config);