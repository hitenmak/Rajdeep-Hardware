import { Schema, model } from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';

// Interfaces
import { IRolePermission } from './interface';

//--------------------------------------------------------------

const permissionSchema = new Schema({
    isMaster: { type: Boolean, default: false },
    modules: { type: Schema.Types.Mixed, default: {} },
}, { _id: false });

const schema: Schema<IRolePermission> = new Schema({
    name: { type: String, default: null },
    department: { type: String, default: null },
    permission: { type: permissionSchema, default: () => ({}) },
}, { timestamps: true });

schema.plugin(mongoosePagination);
export default model<IRolePermission>('rolePermissions', schema, 'rolePermissions') as any;