const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema(
  {
    // Reference to an Item that lives in the Item Service's database.
    // Not a Mongoose ref - the Claim Service validates it over REST.
    itemId: { type: String, required: [true, 'itemId is required'], index: true },
    // Snapshot of item info taken at claim time (so lists work even if Item Service is slow)
    itemTitle: { type: String, default: '' },
    claimantName: { type: String, required: [true, 'Claimant name is required'], trim: true },
    claimantEmail: {
      type: String,
      required: [true, 'Claimant email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    claimantPhone: { type: String, trim: true, default: '' },
    rollNumber: { type: String, trim: true, default: '' },
    proofDescription: {
      type: String,
      required: [true, 'Proof of ownership is required'],
      trim: true,
      minlength: [10, 'Please describe the proof in at least 10 characters'],
      maxlength: 1000,
    },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    adminNote: { type: String, trim: true, default: '' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Claim', claimSchema);
