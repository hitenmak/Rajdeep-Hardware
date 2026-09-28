import { Document } from 'mongoose';

//--------------------------------------------------------------

interface IPermission {
    isMaster: boolean | null,
    modules: any
}

export interface IRolePermission extends Document {
    name: string | null;
    department: string | null;
    permission: IPermission;
}
