const mongoose = require('mongoose');

// One message in the conversation between the admin desk and the claimant
const messageSchema = new mongoose.Schema(
  {
    from: { type: String, enum: ['admin', 'student'], required: true },
    authorName: { type: String, default: '' },
    text: { type: String, required: [true, 'Message text is required'], trim: true, maxlength: [1000, 'Message is too long'] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const claimSchema = new mongoose.Schema(
  {
    // Reference to an Item that lives in the Item Service's database.
    // Not a Mongoose ref - the Claim Service validates it over REST.
    itemId: { type: String, required: [true, 'itemId is required'], index: true },
    // Snapshot of item info taken at claim time (so lists work even if Item Service is slow)
    itemTitle: { type: String, default: '' },
    // Account in the User Service that made the claim; name/email/roll are copied from it
    claimantId: { type: String, default: '', index: true },
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
    // Questions from the admin desk and the student's answers
    messages: { type: [messageSchema], default: [] },
    // true when the desk has asked something the student hasn't answered yet
    awaitingReply: { type: Boolean, default: false },
    adminNote: { type: String, trim: true, default: '' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Claim', claimSchema);
