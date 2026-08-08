const mongoose = require('mongoose');

const ROLES = ['employee', 'manager', 'hr', 'admin', 'founder', 'coo'];

const employeeSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'employee',
      required: true,
    },
    /**
     * Nullable direct manager. Supports flat orgs (Founder -> Employee)
     * and multi-level hierarchies (COO -> Rohan -> Priya -> Employee).
     * Who can review whom is derived from this relationship, not role alone.
     */
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

employeeSchema.index({ companyId: 1, managerId: 1 });
employeeSchema.index({ companyId: 1, email: 1 });

employeeSchema.methods.toSafeObject = function toSafeObject() {
  return {
    _id: this._id,
    companyId: this.companyId,
    name: this.name,
    email: this.email,
    role: this.role,
    managerId: this.managerId,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('Employee', employeeSchema);
module.exports.ROLES = ROLES;
